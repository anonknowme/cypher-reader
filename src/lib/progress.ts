export type LessonStatus = 'locked' | 'unlocked' | 'in-progress' | 'completed';

export interface LessonProgress {
    status: LessonStatus;
    lastStep: number;
    totalSteps: number;
    updatedAt: number;
}

export interface CourseProgress {
    lastAccessedLessonId?: string;
    lessons: {
        [lessonId: string]: LessonProgress;
    };
}

export interface UserProgress {
    courses: {
        [courseId: string]: CourseProgress;
    };
}

const STORAGE_KEY = 'cr_user_progress_v1';

export function getProgress(): UserProgress {
    if (typeof window === 'undefined') return { courses: {} };

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { courses: {} };
        return JSON.parse(raw) as UserProgress;
    } catch (e) {
        console.error('Failed to parse progress', e);
        return { courses: {} };
    }
}

export function saveProgress(progress: UserProgress) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
        console.error('Failed to save progress', e);
    }
}

export function saveLessonProgress(
    courseId: string,
    lessonId: string,
    step: number,
    totalSteps: number
) {
    const current = getProgress();

    if (!current.courses[courseId]) {
        current.courses[courseId] = { lessons: {} };
    }

    const course = current.courses[courseId];
    const now = Date.now();

    // Calculate status
    let status: LessonStatus = 'in-progress';
    if (step >= totalSteps) { // Assuming step 6/6 is strictly completion, or maybe completion happens AFTER step 6?
        // Let's assume step 6 is the last step. completing it (or being on it?)
        // Usually "completed" means finished. Let's rely on caller to say "completed"?
        // For now, if step === totalSteps, we consider it 'completed' or at least 'in-progress' (last step).
        // Let's explicitly check if it was ALREADY completed.
    }

    // Logic: 
    // If we are at step >= totalSteps, we might mark as completed? 
    // Actually, 'completed' is best set explicitly when the user finishes the last step.
    // But for simple tracking, if step === totalSteps, let's treat it as 'completed' for now OR just 'in-progress' (6/6).
    // Let's stick to: 'completed' if step === totalSteps AND the user has finished interaction?
    // Simpler: If step === totalSteps, it's 'completed'.
    if (step >= totalSteps) status = 'completed';

    // Merge
    const existing = course.lessons[lessonId];

    // Don't downgrade status (e.g. from completed back to in-progress if they revisit)
    if (existing?.status === 'completed') {
        status = 'completed';
    }

    course.lessons[lessonId] = {
        status,
        lastStep: step,
        totalSteps,
        updatedAt: now
    };

    course.lastAccessedLessonId = lessonId;

    saveProgress(current);
}

export function getLessonProgress(courseId: string, lessonId: string): LessonProgress | null {
    const current = getProgress();
    return current.courses[courseId]?.lessons[lessonId] || null;
}

export function getCourseProgress(courseId: string): CourseProgress | null {
    const current = getProgress();
    return current.courses[courseId] || null;
}

export function clearCourseProgress(courseId: string) {
    if (typeof window === 'undefined') return;
    const current = getProgress();
    if (current.courses[courseId]) {
        delete current.courses[courseId];
        saveProgress(current);
    }
}
