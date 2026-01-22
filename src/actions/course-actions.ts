'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

// Import types from centralized definitions
import type {
    Course,
    Section,
    Chunk,
    Lesson,
    VocabularyMaster,
    LessonVocabulary,
    Quiz,
    LessonWithChildren
} from '@/types/course.types';

// Re-export types for backward compatibility
export type {
    Course,
    Section,
    Chunk,
    Lesson,
    VocabularyMaster,
    LessonVocabulary,
    Quiz,
    LessonWithChildren
} from '@/types/course.types';

// ============================================
// Read Actions
// ============================================

export async function getAllCourses(): Promise<Course[]> {
    const { data, error } = await supabase
        .from('course')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
}

export async function getCourse(courseId: string): Promise<Course | null> {
    const { data, error } = await supabase
        .from('course')
        .select('*')
        .eq('id', courseId)
        .single();

    if (error) return null;
    return data;
}

export async function getSections(courseId: string): Promise<Section[]> {
    const { data, error } = await supabase
        .from('section')
        .select('*')
        .eq('course_id', courseId)
        .order('order', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
}

export async function getSection(sectionId: string): Promise<Section | null> {
    const { data, error } = await supabase
        .from('section')
        .select('*')
        .eq('id', sectionId)
        .single();

    if (error) return null;
    return data;
}

export async function getLessons(sectionId: string): Promise<LessonWithChildren[]> {
    const { data: lessons, error } = await supabase
        .from('lesson')
        .select('*')
        .eq('section_id', sectionId)
        .order('order', { ascending: true });

    if (error) throw new Error(error.message);
    if (!lessons) return [];

    // Fetch details for all lessons in parallel
    const lessonsWithDetails = await Promise.all(lessons.map(async (lesson) => {
        return await getLessonDetails(lesson);
    }));

    return lessonsWithDetails;
}

export async function getLesson(lessonId: string): Promise<LessonWithChildren | null> {
    const { data: lesson, error } = await supabase
        .from('lesson')
        .select('*')
        .eq('id', lessonId)
        .single();

    if (error || !lesson) return null;

    return await getLessonDetails(lesson);
}

// Helper to hydrate lesson with vocab and quizzes
async function getLessonDetails(lesson: Lesson): Promise<LessonWithChildren> {
    const adminSupabase = getAdminClient();
    // 1. Fetch Vocabulary (Join LessonVocab -> VocabMaster)
    const { data: vocabData, error: vocabError } = await adminSupabase
        .from('lesson_vocabulary')
        .select(`
            id,
            word,
            lemma,
            context_match,
            vocabulary_master (
                definition,
                part_of_speech,
                level
            )
        `)
        .eq('lesson_id', lesson.id);

    const vocabulary: LessonVocabulary[] = vocabData?.map((item: any) => {
        return {
            id: item.id,
            word: item.word,
            lemma: item.lemma,
            context_match: item.context_match,
            definition: item.vocabulary_master?.definition || '',
            part_of_speech: item.vocabulary_master?.part_of_speech || null,
            level: item.vocabulary_master?.level || null
        };
    }) || [];

    // 2. Fetch Quizzes
    const { data: quizzes, error: quizError } = await adminSupabase
        .from('quiz')
        .select('*')
        .eq('lesson_id', lesson.id);

    // Map quiz fields for compatibility if needed
    const mappedQuizzes = quizzes?.map(q => ({
        ...q,
        segments: q.question,      // UI compatibility
        correctAnswers: q.answer,  // UI compatibility
        distractors: q.options     // UI compatibility
    })) || [];

    return {
        ...lesson,
        chunks: lesson.chunks || [], // Ensure chunks array
        vocabulary,
        quizzes: mappedQuizzes
    };
}

export async function getLessonCount(sectionId: string): Promise<number> {
    const { count, error } = await supabase
        .from('lesson')
        .select('*', { count: 'exact', head: true })
        .eq('section_id', sectionId);

    if (error) throw new Error(error.message);
    return count || 0;
}

// ============================================
// Write Actions
// ============================================

// Helper to get Admin Client (Service Role)
// This strictly uses the SERVICE ROLE KEY from server-side env
// to bypass RLS for Admin operations.
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!adminKey || !url) {
        // Fallback for dev/local if key is missing (though RLS blocked)
        console.warn('⚠️ Missing SUPABASE_SERVICE_ROLE_KEY. Admin writes may fail due to RLS.');
        return supabase;
    }

    return createClient(url, adminKey, {
        db: { schema: 'cypher_reader' },
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

// ... (Existing read functions remain unchanged using 'supabase' client) ...

// ============================================
// Write Actions (Using Admin Client)
// ============================================

export async function createCourse(data: { id: string, title: string, description: string, img_url: string }) {
    const adminSupabase = getAdminClient();
    const { error } = await adminSupabase
        .from('course')
        .insert([{
            id: data.id,
            title: data.title,
            description: data.description,
            img_url: data.img_url,
            structure: {}
        }]);

    if (error) throw new Error(error.message);
    revalidatePath('/admin2');
    return data;
}

export async function createSection(courseId: string, title: string, id?: string) {
    const adminSupabase = getAdminClient();
    // Get max order
    const { data: siblings } = await adminSupabase
        .from('section')
        .select('order')
        .eq('course_id', courseId)
        .order('order', { ascending: false })
        .limit(1);

    const maxOrder = siblings?.[0]?.order || 0;
    const newId = id || `section-${Date.now()}`;

    const { error } = await adminSupabase
        .from('section')
        .insert([{
            id: newId,
            course_id: courseId,
            title,
            order: maxOrder + 1
        }]);

    if (error) throw new Error(error.message);
    revalidatePath(`/admin2`);
    return { id: newId };
}

export async function deleteSection(sectionId: string) {
    const adminSupabase = getAdminClient();
    const { error } = await adminSupabase
        .from('section')
        .delete()
        .eq('id', sectionId);

    if (error) throw new Error(error.message);
    revalidatePath('/admin2');
}

export async function createLesson(courseId: string, sectionId: string, id: string) {
    const adminSupabase = getAdminClient();
    const { data: siblings } = await adminSupabase
        .from('lesson')
        .select('order')
        .eq('section_id', sectionId)
        .order('order', { ascending: false })
        .limit(1);

    const maxOrder = siblings?.[0]?.order || 0;

    const { error } = await adminSupabase
        .from('lesson')
        .insert([{
            id,
            course_id: courseId,
            section_id: sectionId,
            order: maxOrder + 1,
            title: '',
            original_text: '',
            translation_kr: '',
            context_desc: '',
            chunks: []
        }]);

    if (error) throw new Error(error.message);
    revalidatePath('/admin2');
    return { id };
}

export async function updateLesson(lessonId: string, contentJson: any[], metadata?: any) {
    const adminSupabase = getAdminClient();
    const content = Array.isArray(contentJson) ? contentJson[0] : contentJson;
    if (!content) return null;

    // 1. Update Lesson Content
    const updateData: any = {
        updated_at: new Date().toISOString()
    };
    if (content.original_text !== undefined) updateData.original_text = content.original_text;
    if (content.translation_kr !== undefined) updateData.translation_kr = content.translation_kr;
    if (content.context_desc !== undefined) updateData.context_desc = content.context_desc;
    if (content.audio_url !== undefined) updateData.audio_url = content.audio_url;

    // Auto-title
    if (content.original_text) {
        updateData.title = content.original_text.substring(0, 50) + (content.original_text.length > 50 ? '...' : '');
    }

    // Chunks (JSONB)
    if (Array.isArray(content.chunks)) {
        updateData.chunks = content.chunks.map((chunk: any, idx: number) => ({
            order: idx + 1,
            en: chunk.en,
            kr: chunk.kr
        }));
    }

    const { error: lessonError } = await adminSupabase
        .from('lesson')
        .update(updateData)
        .eq('id', lessonId);

    if (lessonError) throw new Error(lessonError.message);

    // 2. Update Vocabulary (Sync)
    if (Array.isArray(content.vocabulary)) {
        // First delete existing mappings
        await adminSupabase.from('lesson_vocabulary').delete().eq('lesson_id', lessonId);

        // Process each vocab
        for (const vocab of content.vocabulary) {
            // Upsert Master
            const { error: masterError } = await adminSupabase
                .from('vocabulary_master')
                .upsert({
                    lemma: vocab.lemma,
                    definition: vocab.definition,
                    part_of_speech: vocab.part_of_speech,
                    level: vocab.level // Update level
                }, { onConflict: 'lemma' });

            if (masterError) console.error('Vocab Master Error', masterError);

            // Insert Mapping
            await adminSupabase.from('lesson_vocabulary').insert({
                lesson_id: lessonId,
                lemma: vocab.lemma,
                word: vocab.word,
                context_match: vocab.context_match !== false
            });
        }
    }

    // 3. Update Quizzes
    if (Array.isArray(content.quizzes)) {
        // Replace all quizzes
        await adminSupabase.from('quiz').delete().eq('lesson_id', lessonId);

        const newQuizzes = content.quizzes.map((q: any) => ({
            id: (q.id && !q.id.startsWith('temp-')) ? q.id : crypto.randomUUID(), // Generate ID manually as DB lacks default
            lesson_id: lessonId,
            type: q.type || 'blank',
            question: q.segments || q.question,
            answer: q.correctAnswers || q.answer,
            options: q.distractors || q.options
        }));

        if (newQuizzes.length > 0) {
            await adminSupabase.from('quiz').insert(newQuizzes);
        }
    }

    revalidatePath('/admin2');
    revalidatePath(`/learn`);
    return await getLesson(lessonId);
}

export async function deleteLesson(lessonId: string) {
    const adminSupabase = getAdminClient();
    // 1. Get info before delete for reordering
    const { data: lesson } = await adminSupabase
        .from('lesson')
        .select('section_id, order')
        .eq('id', lessonId)
        .single();

    if (!lesson) return { success: false };

    // 2. Delete Lesson (Cascade will handle chunks, vocab, quiz)
    const { error } = await adminSupabase
        .from('lesson')
        .delete()
        .eq('id', lessonId);

    if (error) throw new Error(error.message);

    // 3. Reorder subsequent lessons
    // Note: This is loop-heavy, ideally stored proc. For now, doing it client-side.
    const { data: subsequent } = await adminSupabase
        .from('lesson')
        .select('id, order')
        .eq('section_id', lesson.section_id)
        .gt('order', lesson.order);

    if (subsequent && subsequent.length > 0) {
        for (const l of subsequent) {
            await adminSupabase
                .from('lesson')
                .update({ order: l.order - 1 })
                .eq('id', l.id);
        }
    }

    revalidatePath('/admin2');
    return { success: true };
}

export async function mergeLessons(targetLessonId: string, sourceLessonId: string) {
    const adminSupabase = getAdminClient();
    const target = await getLesson(targetLessonId);
    const source = await getLesson(sourceLessonId);

    if (!target || !source) throw new Error("Lesson not found");

    // 1. Prepare Merged Data
    const mergedText = target.original_text + "\n\n" + source.original_text;
    const mergedTrans = target.translation_kr + "\n\n" + source.translation_kr;
    const mergedCtx = target.context_desc + " | " + source.context_desc;

    // Chunks
    const targetChunks = target.chunks || [];
    const sourceChunks = (source.chunks || []).map((chunk, idx) => ({
        ...chunk,
        order: targetChunks.length + idx + 1
    }));
    const mergedChunks = [...targetChunks, ...sourceChunks];

    // 2. Perform Updates
    // Update Target Text & Chunks
    await adminSupabase.from('lesson').update({
        original_text: mergedText,
        translation_kr: mergedTrans,
        context_desc: mergedCtx,
        chunks: mergedChunks, // JSONB update
        updated_at: new Date().toISOString()
    }).eq('id', targetLessonId);

    // Relink Vocabulary
    const { data: sourceVocabData } = await adminSupabase.from('lesson_vocabulary').select('*').eq('lesson_id', sourceLessonId);
    if (sourceVocabData) {
        for (const v of sourceVocabData) {
            const { error } = await adminSupabase.from('lesson_vocabulary').insert({
                lesson_id: targetLessonId,
                lemma: v.lemma,
                word: v.word,
                context_match: v.context_match
            });
            // If conflict, it will fail (error), which is fine, we skip duplicates
        }
    }

    // Relink Quizzes
    await adminSupabase.from('quiz')
        .update({ lesson_id: targetLessonId })
        .eq('lesson_id', sourceLessonId);

    // 3. Delete Source Lesson (And reorder)
    await deleteLesson(sourceLessonId);

    revalidatePath('/admin2');
    return { success: true };
}


// ============================================
// Helper Actions (Legacy V3 Support)
// ============================================

export async function deleteAllLessonsInSection(sectionId: string) {
    const adminSupabase = getAdminClient();
    const { error } = await adminSupabase
        .from('lesson')
        .delete()
        .eq('section_id', sectionId);

    if (error) throw new Error(error.message);
    revalidatePath('/admin2');
    return { success: true };
}

export async function getAllLessonsForCourse(courseId: string) {
    const { data, error } = await supabase
        .from('lesson')
        .select('*')
        .eq('course_id', courseId);

    if (error) throw new Error(error.message);
    return data || [];
}

export async function getLessonSummaries(sectionId: string) {
    const { data, error } = await supabase
        .from('lesson')
        .select(`
            id, 
            section_id, 
            order, 
            title, 
            original_text, 
            chunks,
            lesson_vocabulary (count)
        `)
        .eq('section_id', sectionId)
        .order('order', { ascending: true });

    if (error) throw new Error(error.message);

    return (data || []).map((l: any) => {
        const vocabCount = l.lesson_vocabulary?.[0]?.count ?? 0;
        const fullText = l.original_text || '';
        const wordCount = fullText.trim().split(/\s+/).filter((w: string) => w.length > 0).length;

        return {
            id: l.id,
            section_id: l.section_id,
            order: l.order,
            title: l.title || (l.original_text ? (l.original_text.substring(0, 50) + '...') : 'No content'),
            preview: l.original_text ? (l.original_text.substring(0, 100) + '...') : 'No content',
            chunkCount: Array.isArray(l.chunks) ? l.chunks.length : 0,
            vocabularyCount: vocabCount,
            totalWordCount: wordCount,
            subLessonCount: 1
        };
    });
}

// Delete Course
export async function deleteCourse(id: string) {
    const adminSupabase = getAdminClient();
    const { error } = await adminSupabase
        .from('course')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/admin2');
    return { success: true };
}
