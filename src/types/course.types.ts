/**
 * Course Types
 * 
 * Centralized type definitions for the CypherReader course system.
 * Matches Supabase schema defined in schema_v3.sql
 */

// ============================================
// Core Entity Types
// ============================================

export interface Course {
    id: string;
    title: string;
    description: string;
    img_url: string;
    structure: any; // JSONB
    created_at: string;
    updated_at: string;
}

export interface Section {
    id: string;
    course_id: string;
    title: string;
    order: number;
    created_at: string;
    updated_at: string;
}

export interface Chunk {
    order: number;
    en: string;
    kr: string;
}

export interface Lesson {
    id: string;
    course_id: string;
    section_id: string;
    order: number;
    title: string;
    original_text: string;
    translation_kr: string;
    context_desc: string;
    audio_url?: string;
    chunks: Chunk[]; // JSONB
    created_at: string;
    updated_at: string;
}

// ============================================
// Vocabulary Types
// ============================================

export interface VocabularyMaster {
    lemma: string;
    definition: string;
    part_of_speech: string | null;
    level?: string | null;
}

export interface LessonVocabulary {
    id?: string;
    word: string;
    lemma: string;
    definition: string;
    part_of_speech?: string | null;
    level?: string | null;
    context_match?: boolean;
}

// ============================================
// Quiz Types
// ============================================

export interface Quiz {
    id: string;
    lesson_id: string;
    type: string;
    question: any; // JSONB - quiz segments
    answer: any;   // JSONB - correct answers
    options: any;  // JSONB - distractors
}

// ============================================
// Composite UI Types
// ============================================

export interface LessonWithChildren extends Lesson {
    vocabulary: LessonVocabulary[];
    quizzes: Quiz[];
}
