'use server';

import fs from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';

// Path to V2 and V3 DBs
const DB_PATH_V2 = path.join(process.cwd(), 'src', 'data', 'mock_db_v2.json');
const DB_PATH_V3 = path.join(process.cwd(), 'src', 'data', 'mock_db_v3.json');

// --- Types (Flattened Schema) ---

export type CourseDataV3 = {
    id: string
    title: string
    description: string
    img_url: string
}

export type SectionDataV3 = {
    id: string
    course_id: string
    title: string
    order: number
}

// Flattened Lesson Type (Lesson contains the Text Content directly)
export type LessonDataV3 = {
    id: string
    course_id: string
    section_id: string
    order: number
    title?: string // Optional, can be derived from original_text

    // Content Fields (Merged from ContentBlock)
    original_text: string
    translation_kr: string
    context_desc: string
    audio_url?: string

    created_at: string
    updated_at: string
}

export type ChunkDataV3 = {
    id: string
    lesson_id: string // Linked directly to Lesson
    order: number
    en: string
    kr: string
    lemma?: string
}

export type VocabularyDataV3 = {
    id: string
    lesson_id: string // Linked directly to Lesson
    word: string
    lemma?: string
    definition: string
    context_match?: boolean
}

export type QuizDataV3 = {
    id: string
    lesson_id: string // Linked directly to Lesson
    type: string
    question: any
    answer: any
    options?: any
}

// Helper type for UI (Lesson with joined children)
export type LessonWithChildren = LessonDataV3 & {
    chunks: ChunkDataV3[]
    vocabulary: VocabularyDataV3[]
    quizzes: QuizDataV3[]
}

// Alias for UI compatibility if needed via legacy imports
export type ContentBlock = LessonWithChildren;

type DBV3 = {
    courses: CourseDataV3[]
    sections: SectionDataV3[]
    lessons: LessonDataV3[]
    chunks: ChunkDataV3[]
    vocabulary: VocabularyDataV3[]
    quizzes: QuizDataV3[]
}

// --- Helper: Get DB ---
async function getDBV3(): Promise<DBV3> {
    try {
        const data = await fs.readFile(DB_PATH_V3, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        // Init empty
        return {
            courses: [],
            sections: [],
            lessons: [],
            chunks: [],
            vocabulary: [],
            quizzes: []
        };
    }
}

async function saveDBV3(db: DBV3) {
    await fs.writeFile(DB_PATH_V3, JSON.stringify(db, null, 2), 'utf-8');
}

// --- Migration Stub ---
export async function migrateV2toV3() {
    return { success: true, stats: { lessons: 0 } };
}

// --- CRUD Actions (V3) ---

// Get All Courses
export async function getAllCoursesV3() {
    const db = await getDBV3();
    return db.courses;
}

export async function createCourseV3(course: CourseDataV3) {
    const db = await getDBV3();
    db.courses.push(course);
    await saveDBV3(db);
    revalidatePath('/admin2');
    return course;
}

export async function deleteCourseV3(courseId: string) {
    const db = await getDBV3();
    // Cascade delete sections
    const sections = db.sections.filter(s => s.course_id === courseId);
    for (const section of sections) {
        await deleteSectionV3(section.id);
    }
    db.courses = db.courses.filter(c => c.id !== courseId);
    await saveDBV3(db);
    revalidatePath('/admin2');
}

export async function getSectionsV3(courseId: string) {
    const db = await getDBV3();
    return db.sections.filter(s => s.course_id === courseId).sort((a, b) => a.order - b.order);
}

export async function createSectionV3(courseId: string, title: string, id?: string) {
    const db = await getDBV3();
    const siblings = db.sections.filter(s => s.course_id === courseId);
    const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(s => s.order)) : 0;

    const newSection: SectionDataV3 = {
        id: id || `section-${Date.now()}`,
        course_id: courseId,
        title,
        order: maxOrder + 1
    };
    db.sections.push(newSection);
    await saveDBV3(db);
    revalidatePath('/admin2');
    return newSection;
}

export async function deleteSectionV3(sectionId: string) {
    const db = await getDBV3();

    // Cascade delete lessons
    const lessons = db.lessons.filter(l => l.section_id === sectionId);
    for (const lesson of lessons) {
        // Delete items linked to lesson
        db.chunks = db.chunks.filter(c => c.lesson_id !== lesson.id);
        db.vocabulary = db.vocabulary.filter(v => v.lesson_id !== lesson.id);
        db.quizzes = db.quizzes.filter(q => q.lesson_id !== lesson.id);
    }
    db.lessons = db.lessons.filter(l => l.section_id !== sectionId);
    db.sections = db.sections.filter(s => s.id !== sectionId);

    await saveDBV3(db);
    revalidatePath('/admin2');
}

// Get Full Lesson (Join operation)
export async function getLessonV3(lessonId: string): Promise<LessonWithChildren | undefined> {
    const db = await getDBV3();
    const lesson = db.lessons.find(l => l.id === lessonId);
    if (!lesson) return undefined;

    // Join Children
    const chunks = db.chunks.filter(c => c.lesson_id === lessonId).sort((a, b) => a.order - b.order);
    const vocabulary = db.vocabulary.filter(v => v.lesson_id === lessonId);
    const quizzes = db.quizzes.filter(q => q.lesson_id === lessonId).map(q => ({
        ...q,
        // Compatibility Map
        segments: q.question,
        correctAnswers: q.answer,
        distractors: q.options
    }));

    return {
        ...lesson,
        chunks,
        vocabulary,
        quizzes
    };
}

// Get Lesson Summaries (Lightweight)
export async function getLessonSummariesV3(sectionId: string) {
    const db = await getDBV3();
    const lessons = db.lessons
        .filter(l => l.section_id === sectionId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    return lessons.map(l => {
        return {
            id: l.id,
            section_id: l.section_id,
            order: l.order || 0,
            title: l.title || (l.original_text ? (l.original_text.substring(0, 50) + '...') : 'No content'),
            preview: l.original_text ? (l.original_text.substring(0, 100) + '...') : 'No content',
            chunkCount: db.chunks.filter(c => c.lesson_id === l.id).length,
            subLessonCount: 1
        };
    });
}

// Get All Lessons for a Course (For Badge Counts)
export async function getAllLessonsV3(courseId: string) {
    const db = await getDBV3();
    return db.lessons.filter(l => l.course_id === courseId);
}

export async function createLessonV3(courseId: string, sectionId: string, id: string): Promise<LessonDataV3> {
    const db = await getDBV3();

    const siblings = db.lessons.filter(l => l.section_id === sectionId);
    const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(s => s.order)) : 0;

    const newLesson: LessonDataV3 = {
        id,
        course_id: courseId,
        section_id: sectionId,
        order: maxOrder + 1,
        title: '',
        original_text: '',
        translation_kr: '',
        context_desc: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    db.lessons.push(newLesson);
    await saveDBV3(db);
    revalidatePath('/admin2');
    return newLesson;
}

export async function updateLessonV3(lessonId: string, contentJson: any[], metadata?: { sub_lesson_count?: number }) {
    const db = await getDBV3();
    const lessonIndex = db.lessons.findIndex(l => l.id === lessonId);
    if (lessonIndex === -1) return null;

    const content = Array.isArray(contentJson) ? contentJson[0] : contentJson;
    if (!content) return null;

    const lesson = db.lessons[lessonIndex];

    lesson.original_text = content.original_text || lesson.original_text;
    lesson.translation_kr = content.translation_kr || lesson.translation_kr;
    lesson.context_desc = content.context_desc || lesson.context_desc;
    lesson.audio_url = content.audio_url || lesson.audio_url;

    if (!lesson.title || lesson.original_text !== db.lessons[lessonIndex].original_text) {
        lesson.title = lesson.original_text ? (lesson.original_text.substring(0, 50) + (lesson.original_text.length > 50 ? '...' : '')) : '';
    }

    lesson.updated_at = new Date().toISOString();

    // RE-CREATE CHILDREN
    db.chunks = db.chunks.filter(c => c.lesson_id !== lessonId);
    db.vocabulary = db.vocabulary.filter(v => v.lesson_id !== lessonId);
    db.quizzes = db.quizzes.filter(q => q.lesson_id !== lessonId);

    if (Array.isArray(content.chunks)) {
        const seenIds = new Set<string>();
        content.chunks.forEach((chunk: any, idx: number) => {
            let chunkId = chunk.id;
            if (!chunkId || seenIds.has(chunkId)) {
                chunkId = `chunk-${lessonId}-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`;
            }
            seenIds.add(chunkId);

            db.chunks.push({
                id: chunkId,
                lesson_id: lessonId,
                order: idx + 1,
                en: chunk.en,
                kr: chunk.kr,
                lemma: chunk.lemma
            });
        });
    }

    if (Array.isArray(content.vocabulary)) {
        const seenIds = new Set<string>();
        content.vocabulary.forEach((vocab: any, idx: number) => {
            let vocabId = vocab.id;
            if (!vocabId || seenIds.has(vocabId)) {
                vocabId = `vocab-${lessonId}-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`;
            }
            seenIds.add(vocabId);

            db.vocabulary.push({
                id: vocabId,
                lesson_id: lessonId,
                word: vocab.word,
                lemma: vocab.lemma,
                definition: vocab.definition,
                context_match: vocab.context_match
            });
        });
    }

    if (Array.isArray(content.quizzes)) {
        const seenIds = new Set<string>();
        content.quizzes.forEach((quiz: any, idx: number) => {
            let quizId = quiz.id;
            if (!quizId || seenIds.has(quizId)) {
                quizId = `quiz-${lessonId}-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`;
            }
            seenIds.add(quizId);

            db.quizzes.push({
                id: quizId,
                lesson_id: lessonId,
                type: quiz.type || 'blank',
                question: quiz.segments || quiz.question,
                answer: quiz.correctAnswers || quiz.answer,
                options: quiz.distractors || quiz.options
            });
        });
    }

    await saveDBV3(db);
    revalidatePath('/admin2');
    return await getLessonV3(lessonId);
}

export async function deleteLessonV2(lessonId: string) { return deleteLessonV3(lessonId); }
export async function deleteLessonV3(lessonId: string) {
    const db = await getDBV3();

    db.chunks = db.chunks.filter(c => c.lesson_id !== lessonId);
    db.vocabulary = db.vocabulary.filter(v => v.lesson_id !== lessonId);
    db.quizzes = db.quizzes.filter(q => q.lesson_id !== lessonId);

    db.lessons = db.lessons.filter(l => l.id !== lessonId);

    await saveDBV3(db);
    revalidatePath('/admin2');
    return { success: true };
}

export async function deleteAllLessonsInSectionV3(sectionId: string) {
    const db = await getDBV3();
    const lessons = db.lessons.filter(l => l.section_id === sectionId);

    for (const lesson of lessons) {
        db.chunks = db.chunks.filter(c => c.lesson_id !== lesson.id);
        db.vocabulary = db.vocabulary.filter(v => v.lesson_id !== lesson.id);
        db.quizzes = db.quizzes.filter(q => q.lesson_id !== lesson.id);
    }

    db.lessons = db.lessons.filter(l => l.section_id !== sectionId);

    await saveDBV3(db);
    revalidatePath('/admin2');
    return { success: true };
}

export async function mergeLessonsV3(targetLessonId: string, sourceLessonId: string) {
    const db = await getDBV3();
    const target = db.lessons.find(l => l.id === targetLessonId);
    const source = db.lessons.find(l => l.id === sourceLessonId);

    if (!target || !source) throw new Error("Lesson not found");

    // Concatenate Texts
    target.original_text += "\n\n" + source.original_text;
    target.translation_kr += "\n\n" + source.translation_kr;
    target.context_desc += " | " + source.context_desc;

    // Re-parent Children
    const targetChunkCount = db.chunks.filter(c => c.lesson_id === targetLessonId).length;

    const sourceChunks = db.chunks.filter(c => c.lesson_id === sourceLessonId);
    sourceChunks.forEach((c, idx) => {
        c.lesson_id = targetLessonId;
        c.order = targetChunkCount + idx + 1;
    });

    const sourceVocab = db.vocabulary.filter(v => v.lesson_id === sourceLessonId);
    sourceVocab.forEach(v => v.lesson_id = targetLessonId);

    const sourceQuizzes = db.quizzes.filter(q => q.lesson_id === sourceLessonId);
    sourceQuizzes.forEach(q => q.lesson_id = targetLessonId);

    // Delete Source Lesson
    db.lessons = db.lessons.filter(l => l.id !== sourceLessonId);

    await saveDBV3(db);
    revalidatePath('/admin2');
    return { success: true };
}
