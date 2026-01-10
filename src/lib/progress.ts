export type LessonStatus = 'locked' | 'unlocked' | 'in-progress' | 'completed';

export interface LessonProgress {
    status: LessonStatus;
    lastStep: number;
    totalSteps: number;
    updatedAt: number;
    data?: any; // For storing step-specific data (e.g. inputs)
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
    totalSteps: number,
    data?: any
) {
    const current = getProgress();

    if (!current.courses[courseId]) {
        current.courses[courseId] = { lessons: {} };
    }

    const course = current.courses[courseId];
    const now = Date.now();

    // Calculate status
    // Calculate status
    let status: LessonStatus = 'in-progress';

    // Only mark as completed if step > totalSteps
    if (step > totalSteps) status = 'completed';

    const existing = course.lessons[lessonId];

    // Don't downgrade status (e.g. from completed back to in-progress if they revisit)
    if (existing?.status === 'completed') {
        status = 'completed';
    }

    course.lessons[lessonId] = {
        status,
        lastStep: step,
        totalSteps,
        updatedAt: now,
        data: data || existing?.data // Merge new data or keep existing
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
