'use server';

import fs from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';

const DB_PATH = path.join(process.cwd(), 'src', 'data', 'mock_db_v2.json');

export type CourseDataV2 = {
    id: string; // e.g. 'bitcoin-whitepaper'
    title: string;
    description?: string;
    img_url?: string;
};

export type SectionDataV2 = {
    id: string; // e.g. 'bitcoin-whitepaper-ch1'
    course_id: string;
    title: string; // e.g. 'Chapter 1: Introduction'
    title_kr?: string;
};

export type ContentBlock = {
    original_text: string;
    translation_kr?: string;
    context_desc?: string;
    chunks: Array<{ en: string; kr: string; lemma?: string[] }>;
    vocabulary?: Array<{ word: string; lemma: string; definition: string; context_match?: boolean }>;
    quizzes?: any[];
};

export type LessonDataV2 = {
    id: string;
    course_id: string; // Which course this belongs to
    section_id: string; // Which section this belongs to
    order: number; // Order within the section
    content_json: ContentBlock[]; // Array of content blocks
    sub_lesson_count?: number;
    updated_at?: string;
};

type MockDB = {
    courses: CourseDataV2[];
    sections: SectionDataV2[];
    lessons: LessonDataV2[];
};

async function getDB(): Promise<MockDB> {
    try {
        const data = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        // Return empty if file error
        return { courses: [], sections: [], lessons: [] };
    }
}

async function saveDB(db: MockDB) {
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

// --- Course Actions ---

export async function getAllCoursesV2() {
    const db = await getDB();
    // Sort by "created" (simulated by array order for now)
    return db.courses;
}

export async function createCourseV2(course: Partial<CourseDataV2>) {
    const db = await getDB();

    if (db.courses.find(c => c.id === course.id)) {
        throw new Error("Course ID already exists");
    }

    const newCourse: CourseDataV2 = {
        id: course.id || '',
        title: course.title || '',
        description: course.description || '',
        img_url: course.img_url
    };

    db.courses.unshift(newCourse); // Add to top
    await saveDB(db);
    revalidatePath('/admin2');
}

// --- Lesson Actions ---

export async function createLessonV2(courseId: string, sectionId: string, id: string) {
    const db = await getDB();

    if (db.lessons.find(l => l.id === id)) {
        throw new Error("Lesson ID already exists");
    }

    // Calculate order: find max order in this section and add 1
    const existingLessons = db.lessons.filter(l => l.section_id === sectionId);
    const maxOrder = existingLessons.length > 0
        ? Math.max(...existingLessons.map(l => l.order || 0))
        : 0;

    const newLesson: LessonDataV2 = {
        id,
        course_id: courseId,
        section_id: sectionId,
        order: maxOrder + 1,
        content_json: [],
        sub_lesson_count: 0
    };

    db.lessons.push(newLesson);
    await saveDB(db);
    revalidatePath('/admin2');
    return newLesson;
}

export async function updateLessonV2(lessonId: string, contentJson: any, metadata?: { sub_lesson_count?: number }) {
    const db = await getDB();
    const lessonIndex = db.lessons.findIndex(l => l.id === lessonId);

    if (lessonIndex === -1) {
        throw new Error("Lesson not found");
    }

    db.lessons[lessonIndex].content_json = contentJson;
    db.lessons[lessonIndex].updated_at = new Date().toISOString();

    if (metadata && typeof metadata.sub_lesson_count === 'number') {
        db.lessons[lessonIndex].sub_lesson_count = metadata.sub_lesson_count;
    } else {
        // Auto-update count if not provided
        if (Array.isArray(contentJson)) {
            db.lessons[lessonIndex].sub_lesson_count = contentJson.length;
        }
    }

    await saveDB(db);
    revalidatePath('/admin2');
    return db.lessons[lessonIndex];
}

export async function getLessonV2(lessonId: string) {
    const db = await getDB();
    return db.lessons.find(l => l.id === lessonId) || null;
}

export async function getLessonSummariesV2(courseId: string) {
    const db = await getDB();
    const lessons = db.lessons.filter(l => l.course_id === courseId);

    return lessons.map(d => {
        const content: any = d.content_json;
        const firstBlock = Array.isArray(content) && content.length > 0 ? content[0] : (Array.isArray(content) ? null : content);
        const previewText = firstBlock ? firstBlock.original_text : '';

        return {
            id: d.id,
            section_id: d.section_id,
            order: d.order || 0,
            preview: previewText?.substring(0, 100) + '...',
            chunkCount: 0,
            subLessonCount: d.sub_lesson_count || (Array.isArray(content) ? content.length : (content ? 1 : 0))
        };
    });
}

// ==========================================
// Section Management Functions
// ==========================================

export async function getSectionsV2(courseId: string): Promise<SectionDataV2[]> {
    const db = await getDB();
    return db.sections.filter(s => s.course_id === courseId).sort((a, b) => a.id.localeCompare(b.id));
}

export async function createSectionV2(section: Partial<SectionDataV2>) {
    const db = await getDB();

    if (db.sections.find(s => s.id === section.id)) {
        throw new Error("Section ID already exists");
    }

    const newSection: SectionDataV2 = {
        id: section.id || '',
        course_id: section.course_id || '',
        title: section.title || '',
        title_kr: section.title_kr
    };

    db.sections.push(newSection);
    await saveDB(db);
    revalidatePath('/admin2');
    return newSection;
}

// --- Delete Actions ---

export async function deleteCourseV2(courseId: string) {
    const db = await getDB();

    // Find all sections in this course
    const sectionsToDelete = db.sections.filter(s => s.course_id === courseId);
    const sectionIds = sectionsToDelete.map(s => s.id);

    // Delete all lessons in these sections
    db.lessons = db.lessons.filter(l => !sectionIds.includes(l.section_id));

    // Delete all sections in this course
    db.sections = db.sections.filter(s => s.course_id !== courseId);

    // Delete the course
    db.courses = db.courses.filter(c => c.id !== courseId);

    await saveDB(db);
    revalidatePath('/admin2');
    return { success: true, deletedCourse: courseId, deletedSections: sectionIds.length };
}

export async function deleteSectionV2(sectionId: string) {
    const db = await getDB();

    // Delete all lessons in this section
    const deletedLessons = db.lessons.filter(l => l.section_id === sectionId);
    db.lessons = db.lessons.filter(l => l.section_id !== sectionId);

    // Delete the section
    db.sections = db.sections.filter(s => s.id !== sectionId);

    await saveDB(db);
    revalidatePath('/admin2');
    return { success: true, deletedSection: sectionId, deletedLessons: deletedLessons.length };
}

export async function deleteLessonV2(lessonId: string) {
    const db = await getDB();

    // Delete the lesson
    db.lessons = db.lessons.filter(l => l.id !== lessonId);

    await saveDB(db);
    revalidatePath('/admin2');
    return { success: true, deletedLesson: lessonId };
}

export async function deleteAllLessonsInSectionV2(sectionId: string) {
    const db = await getDB();

    // Count lessons to be deleted
    const lessonsToDelete = db.lessons.filter(l => l.section_id === sectionId);
    const count = lessonsToDelete.length;

    // Delete all lessons in this section
    db.lessons = db.lessons.filter(l => l.section_id !== sectionId);

    await saveDB(db);
    revalidatePath('/admin2');
    return { success: true, deletedCount: count };
}

export async function mergeLessonsV2(firstLessonId: string, secondLessonId: string) {
    const db = await getDB();

    const firstLesson = db.lessons.find(l => l.id === firstLessonId);
    const secondLesson = db.lessons.find(l => l.id === secondLessonId);

    if (!firstLesson || !secondLesson) {
        throw new Error("One or both lessons not found");
    }

    if (firstLesson.section_id !== secondLesson.section_id) {
        throw new Error("Lessons must be in the same section");
    }

    // Merge content: append second lesson's content to first lesson
    const mergedContent = [
        ...(Array.isArray(firstLesson.content_json) ? firstLesson.content_json : [firstLesson.content_json]),
        ...(Array.isArray(secondLesson.content_json) ? secondLesson.content_json : [secondLesson.content_json])
    ];

    // Update first lesson with merged content
    firstLesson.content_json = mergedContent;
    firstLesson.sub_lesson_count = mergedContent.length;
    firstLesson.updated_at = new Date().toISOString();

    // Delete second lesson
    db.lessons = db.lessons.filter(l => l.id !== secondLessonId);

    // Reorder lessons in the section (fill the gap)
    const sectionLessons = db.lessons
        .filter(l => l.section_id === firstLesson.section_id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    sectionLessons.forEach((lesson, index) => {
        lesson.order = index + 1;
    });

    await saveDB(db);
    revalidatePath('/admin2');
    return { success: true, mergedLessonId: firstLessonId };
}
