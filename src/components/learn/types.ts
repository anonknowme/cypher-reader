/**
 * Learn Step Component Types
 * 
 * Shared types for learning step components extracted from LearnClient.
 */

import type { LessonData } from '@/actions/lesson-actions';

// ============================================
// Common Step Props
// ============================================

export interface BaseStepProps {
    data: LessonData;
}

// ============================================
// Step-Specific Props
// ============================================

export interface ContextStepProps extends BaseStepProps { }

export interface ReadingStepProps extends BaseStepProps {
    showDefinitions: boolean;
    setShowDefinitions: (show: boolean) => void;
}

export interface ListeningStepProps extends BaseStepProps {
    highlightIndex: number;
    setHighlightIndex: (index: number) => void;
}

export interface SpeakingStepProps extends BaseStepProps {
    recordingUrl: string | null;
    setRecordingUrl: (url: string | null) => void;
}

export interface QuizStepProps extends BaseStepProps {
    quizzes: any[];
    quizStates: QuizState[];
    setQuizStates: (states: QuizState[]) => void;
    activeQuizIndex: number;
    setActiveQuizIndex: (index: number) => void;
}

export interface TypingStepProps extends BaseStepProps {
    chunkInputs: string[];
    setChunkInputs: (inputs: string[]) => void;
    chunkRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
    inputRefs: React.MutableRefObject<(HTMLTextAreaElement | null)[]>;
    onChunkFocus: (index: number) => void;
}

// ============================================
// Quiz Types
// ============================================

export interface QuizState {
    filledBlanks: (string | null)[];
    options: string[];
}

export interface Quiz {
    segments: QuizSegment[];
    correctAnswers: string[];
    distractors: string[];
}

export interface QuizSegment {
    type: 'text' | 'blank';
    content?: string;
    id?: number;
}
