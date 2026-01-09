'use server';

import crypto from 'crypto';
import { genAI } from '@/lib/gemini';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

export interface LessonData {
    original_text: string;
    translation_kr: string;
    context_desc: string;
    chunks: { en: string; kr: string }[];
    vocabulary: { word: string; definition: string; context_match?: boolean }[];
    quiz: {
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

    // Upsert into DB using ADMIN Client (Bypasses RLS)
    const { error } = await supabaseAdmin
        .from('lessons')
        .upsert({
            id: hash,
            course_id: courseId, // Ensure this ID exists in 'courses' table!
            title_kr: data.translation_kr,
            content_json: data
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

    // Return the JSON blob as LessonData
    return data.content_json as LessonData;
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


// --- AI Generation Functions (Keep logic, update storage) ---

export async function splitTextToSegments(text: string): Promise<string[]> {
    if (!process.env.GEMINI_API_KEY) throw new Error('API Key missing');

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
        **Objective**: Split the following text into "Learning Units".
        **Rule**: Each unit should consist of **3 to 5 sentences** to form a substantial context. Avoid splitting into single sentences unless necessary. Group related ideas together.
        **Output**: JSON Array of strings.
        
        **Text**:
        "${text}"
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const cleaned = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Segmentation failed", e);
        throw new Error("AI Segmentation failed. Please try again.");
    }
}

export async function generateLessonContent(sentence: string, forceRefresh: boolean = false, courseId: string = 'playground') {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    const hash = crypto.createHash('sha256').update(sentence).digest('hex');

    // 1. Check DB Cache
    if (!forceRefresh) {
        const cached = await getLessonContent(hash, courseId);
        if (cached) return cached;
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash" });

        // Construct the prompt based on the artifact
        const prompt = `
      **Role**: You are an expert linguistics tutor for Korean students studying English through technical documents (like the Bitcoin Whitepaper).

      **Objective**: Analyze the provided English sentence and generate a JSON object containing translations, chunks, vocabulary, and quiz data.

      **Key Requirements**:
      1.  **Context**: Provide a background explanation suitable for a beginner understanding Bitcoin.
      2.  **Chunking**: Break the sentence into meaningful grammatical chunks (phrases/clauses). **CRITICAL**: If a clause is too long, break it into smaller phrases.
      3.  **Vocabulary**: Identify key technical or difficult words.
      4.  **Quiz**: Create a "fill-in-the-blank" quiz by selecting 2-3 key words. Provide "distractors" (wrong answers) that are contextually relevant but incorrect.

      **Output Format**: Provide ONLY a raw JSON object. Do not include markdown formatting like \`\`\`json.

      **One-Shot Example (Strictly follow this structure)**:
      {
        "original_text": "A purely peer-to-peer version of electronic cash would allow online payments to be sent directly from one party to another without going through a financial institution.",
        "translation_kr": "순수한 P2P(개인 간) 전자 화폐 시스템은 금융 기관을 거치지 않고, 한 당사자가 다른 당사자에게 직접 온라인 결제를 보낼 수 있게 해줍니다.",
        "context_desc": "이 문장은 비트코인이 해결하고자 하는 가장 중요한 문제인 '중개인(은행) 없는 거래'를 정의하고 있습니다. 기존 금융 시스템의 신뢰 비용을 기술적으로 제거하겠다는 비트코인의 탄생 목적이 담겨 있습니다.",
        "chunks": [
          {
            "en": "A purely peer-to-peer version of electronic cash",
            "kr": "순수한 P2P 전자 화폐 시스템은"
          },
          {
            "en": "would allow online payments",
            "kr": "온라인 결제를 가능하게 할 것입니다"
          },
          {
            "en": "to be sent directly from one party to another",
            "kr": "한 당사자에서 다른 당사자로 직접 전송되도록"
          },
          {
            "en": "without going through a financial institution.",
            "kr": "금융 기관을 거치지 않고."
          }
        ],
        "vocabulary": [
          {
            "word": "purely",
            "definition": "순전한",
            "context_match": true
          },
          {
            "word": "directly",
            "definition": "직접적으로",
            "context_match": true
          },
          {
              "word": "financial institution",
              "definition": "금융 기관",
              "context_match": true
          }
        ],
        "quiz": {
          "segments": [
            { "type": "text", "content": "A " },
            { "type": "blank", "content": "purely", "id": 0 },
            { "type": "text", "content": " peer-to-peer version of electronic cash would allow " },
            { "type": "blank", "content": "online", "id": 1 },
            { "type": "text", "content": " payments to be sent directly from one party to another without going through a " },
            { "type": "blank", "content": "financial", "id": 2 },
            { "type": "text", "content": " institution." }
          ],
          "correctAnswers": ["purely", "online", "financial"],
          "distractors": ["digital", "central", "direct"]
        }
      }

      **Actual Task Input**:
      "${sentence}"
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Cleanup simple markdown if present
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(cleanedText);

        // 2. Save to DB
        await saveLessonContent(parsedData, courseId);

        return parsedData;

    } catch (error) {
        console.error("Gemini API Error:", error);
        return null;
    }
}
