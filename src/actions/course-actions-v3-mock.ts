'use server';

import mockData from '@/data/mock_db_v3.json';

// ============================================
// Type Definitions
// ============================================

export interface CourseV3Mock {
    id: string;
    title: string;
    description: string;
    img_url: string;
}

export interface SectionV3Mock {
    id: string;
    course_id: string;
    title: string;
    order: number;
}

export interface ChunkV3Mock {
    order: number;
    en: string;
    kr: string;
}

export interface LessonV3Mock {
    id: string;
    course_id: string;
    section_id: string;
    order: number;
    title: string;
    original_text: string;
    translation_kr: string;
    context_desc: string;
    chunks: ChunkV3Mock[];  // JSONB array
    created_at: string;
    updated_at: string;
}

export interface VocabularyMaster {
    lemma: string;
    definition: string;
    part_of_speech: string | null;
}

export interface LessonVocabulary {
    lesson_id: string;
    lemma: string;
    word: string;
    context_match: boolean;
}

export interface VocabV3Mock {
    word: string;
    lemma: string;
    definition: string;
    part_of_speech?: string | null;
}

export interface QuizV3Mock {
    id: string;
    lesson_id: string;
    type: string;
    question: Array<{ type: string; content: string; id?: number }>;
    answer: string[];
    options: string[];
}

export interface LessonWithChildrenV3Mock extends LessonV3Mock {
    vocabulary: VocabV3Mock[];
    quizzes: QuizV3Mock[];
}

// ============================================
// Helper Functions
// ============================================

function getVocabularyForLesson(lessonId: string): VocabV3Mock[] {
    const lessonVocab = (mockData.lesson_vocabulary as LessonVocabulary[])
        .filter(lv => lv.lesson_id === lessonId);

    return lessonVocab.map(lv => {
        const master = (mockData.vocabulary_master as VocabularyMaster[])
            .find(vm => vm.lemma === lv.lemma);

        return {
            word: lv.word,
            lemma: lv.lemma,
            definition: master?.definition || '',
            part_of_speech: master?.part_of_speech
        };
    });
}

// ============================================
// Server Actions
// ============================================

export async function getAllCoursesV3Mock(): Promise<CourseV3Mock[]> {
    return mockData.courses as CourseV3Mock[];
}

export async function getCourseV3Mock(courseId: string): Promise<CourseV3Mock | null> {
    const course = mockData.courses.find(c => c.id === courseId);
    return course ? (course as CourseV3Mock) : null;
}

export async function getSectionsV3Mock(courseId: string): Promise<SectionV3Mock[]> {
    const sections = mockData.sections
        .filter(s => s.course_id === courseId)
        .sort((a, b) => a.order - b.order);
    return sections as SectionV3Mock[];
}

export async function getSectionV3Mock(sectionId: string): Promise<SectionV3Mock | null> {
    const section = mockData.sections.find(s => s.id === sectionId);
    return section ? (section as SectionV3Mock) : null;
}

export async function getLessonsV3Mock(sectionId: string): Promise<LessonWithChildrenV3Mock[]> {
    const lessons = (mockData.lessons as LessonV3Mock[])
        .filter(l => l.section_id === sectionId)
        .sort((a, b) => a.order - b.order);

    return lessons.map(lesson => ({
        ...lesson,
        vocabulary: getVocabularyForLesson(lesson.id),
        quizzes: (mockData.quizzes as QuizV3Mock[])
            .filter(q => q.lesson_id === lesson.id) as QuizV3Mock[]
    }));
}

export async function getLessonV3Mock(lessonId: string): Promise<LessonWithChildrenV3Mock | null> {
    const lesson = (mockData.lessons as LessonV3Mock[]).find(l => l.id === lessonId);

    if (!lesson) return null;

    return {
        ...lesson,
        vocabulary: getVocabularyForLesson(lesson.id),
        quizzes: (mockData.quizzes as QuizV3Mock[])
            .filter(q => q.lesson_id === lesson.id) as QuizV3Mock[]
    };
}

export async function getLessonCountV3Mock(sectionId: string): Promise<number> {
    return (mockData.lessons as LessonV3Mock[])
        .filter(l => l.section_id === sectionId).length;
}
