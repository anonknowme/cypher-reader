'use server';

import crypto from 'crypto';

import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

export interface LessonData {
  original_text: string;
  translation_kr: string;
  context_desc: string;
  chunks: { en: string; kr: string }[];
  vocabulary: { word: string; lemma?: string; definition: string; context_match?: boolean }[];
  quizzes?: {
    segments: { type: string; content: string; id?: number }[];
    correctAnswers: string[];
    distractors: string[];
  }[];
  quiz?: { // Deprecated: Support legacy data
    segments: { type: string; content: string; id?: number }[];
    correctAnswers: string[];
    distractors: string[];
  };
}

// Helper to check if course exists, if not create a placeholder for playground?
// For now, we assume courseId is valid.

export async function saveLessonContent(data: LessonData, courseId: string = 'playground') {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const hash = crypto.createHash('sha256').update(data.original_text).digest('hex');

  // 1. Centralized Vocabulary Upsert
  const vocabList = data.vocabulary || [];
  if (vocabList.length > 0) {
    // Prepare rows for upsert
    const vocabRows = vocabList.map(v => ({
      lemma: v.lemma || v.word.toLowerCase(), // Fallback to word if lemma missing
      definition: v.definition,
      // part_of_speech: ... // AI doesn't return this yet, optional
    }));

    // Upsert to global vocabulary table
    const { error: vocabError } = await supabaseAdmin
      .from('vocabulary')
      .upsert(vocabRows, { onConflict: 'lemma' });

    if (vocabError) {
      console.error("Vocabulary Upsert Error:", vocabError);
      // We might choose to continue or throw. Let's log and continue to save the lesson at least.
    }
  }

  // 2. Prepare Data for Lesson Storage
  // We want to store a lightweight version of vocabulary in the lesson JSON
  // to force fetching definitions from the global table.
  // However, for safety/fallback, we can keep the definition?
  // User requested "Prevent Duplication".
  // So we should REMOVE definition from the stored JSON, or explicitly ignore it on read.
  // Let's strip definition to save space and ensure single source of truth.
  const optimizedVocab = vocabList.map(v => ({
    word: v.word,
    lemma: v.lemma || v.word.toLowerCase(),
    context_match: v.context_match
    // definition is OMITTED
  }));

  const optimizedData = {
    ...data,
    vocabulary: optimizedVocab
  };


  // Upsert into DB using ADMIN Client (Bypasses RLS)
  const { error } = await supabaseAdmin
    .from('lessons')
    .upsert({
      id: hash,
      course_id: courseId, // Ensure this ID exists in 'courses' table!
      title_kr: data.translation_kr,
      content_json: optimizedData as any // Cast to any to bypass strict typing of full LessonData
    });

  if (error) {
    console.error("Save Lesson Error:", error);
    throw new Error("Failed to save lesson to DB: " + error.message);
  }

  return { success: true, hash };
}

export async function getLessonContent(hashOrText: string, courseId: string = 'playground') {
  // Check if input is a hash (64 hex chars)
  let hash = hashOrText;
  if (hashOrText.length !== 64 || /[^0-9a-f]/.test(hashOrText)) {
    hash = crypto.createHash('sha256').update(hashOrText).digest('hex');
  }

  // Read using standard client (Respects RLS - Public Read is allowed)
  const { data, error } = await supabase
    .from('lessons')
    .select('content_json')
    .eq('id', hash)
    .single();

  if (error || !data) {
    return null;
  }

  const lessonData = data.content_json as LessonData;

  // 3. Hydrate Vocabulary Definitions from Global Table
  if (lessonData.vocabulary && lessonData.vocabulary.length > 0) {
    const lemmas = lessonData.vocabulary.map(v => v.lemma || v.word.toLowerCase());

    // Fetch definitions
    const { data: globalDefs, error: vocabError } = await supabase
      .from('vocabulary')
      .select('lemma, definition')
      .in('lemma', lemmas);

    if (!vocabError && globalDefs) {
      // Create a lookup map
      const defMap = new Map(globalDefs.map(d => [d.lemma, d.definition]));

      // Merge back into lesson data
      lessonData.vocabulary = lessonData.vocabulary.map(v => {
        const lemma = v.lemma || v.word.toLowerCase();
        return {
          ...v,
          lemma: lemma,
          definition: defMap.get(lemma) || v.definition || "(No Definition)" // Fallback to existing or placeholder
        };
      });
    }
  }

  // Return the Hydrated JSON blob
  return lessonData;
}

export async function getLessonSummaries(hashes: string[], courseId: string = 'playground') {
  // Fetch all lessons with these IDs
  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('id, title_kr, content_json')
    .in('id', hashes);

  if (error || !lessons) {
    console.error("Fetch Summaries Error:", error);
    return [];
  }

  // Map to summary format
  // We need to preserve the order of input 'hashes'
  const lessonMap = new Map(lessons.map(l => [l.id, l]));

  return hashes.map(hash => {
    const lesson = lessonMap.get(hash);
    if (!lesson) return { hash, original_text: '(Lesson Not Found)', trans_kr: '' };

    const content = lesson.content_json as LessonData;
    return {
      hash,
      original_text: content.original_text.length > 60 ? content.original_text.substring(0, 60) + '...' : content.original_text,
      trans_kr: content.translation_kr.length > 40 ? content.translation_kr.substring(0, 40) + '...' : content.translation_kr
    };
  });
}


// --- AI Generation Functions REMOVED per user request (Manual JSON Workflow) ---
// See deprecated `generateLessonContent` in git history if needed.

