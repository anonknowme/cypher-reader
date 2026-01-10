'use server';

import { getAllCourses, CourseData } from './course-actions';
import { getLessonContent, LessonData } from './lesson-actions';
import { supabase } from '@/lib/supabase';

export async function migrateContentToDb() {
    try {
        console.log("Starting migration...");

        // 1. Get all courses from JSON
        const courses = await getAllCourses();
        console.log(`Found ${courses.length} courses.`);

        let successCount = 0;
        let failCount = 0;

        for (const course of courses) {
            console.log(`Migrating course: ${course.title} (${course.id})`);

            // 2. Insert Course to DB
            const { error: courseError } = await supabase
                .from('courses')
                .upsert({
                    id: course.id,
                    title: course.title,
                    description: course.description,
                    img_url: course.img_url,
                    lesson_order: course.lessons, // Array of hashes
                });

            if (courseError) {
                console.error(`Failed to insert course ${course.id}:`, courseError);
                failCount++;
                continue; // Skip lessons if course failed
            }

            // 3. Migrate Lessons for this course
            for (const hash of course.lessons) {
                const lesson: LessonData | null = await getLessonContent(hash, course.id);

                if (lesson) {
                    const { error: lessonError } = await supabase
                        .from('lessons')
                        .upsert({
                            id: hash,
                            course_id: course.id,
                            title_kr: lesson.translation_kr,
                            content_json: lesson, // Store the whole JSON blob
                        });

                    if (lessonError) {
                        console.error(`Failed to insert lesson ${hash}:`, lessonError);
                    }
                } else {
                    console.warn(`Lesson content not found for hash: ${hash}`);
                }
            }
            successCount++;
        }

        return { success: true, message: `Migration complete. Success: ${successCount}, Failed: ${failCount}` };
    } catch (error: any) {
        console.error("Migration fatal error:", error);
        return { success: false, error: error.message };
    }
}

export async function migrateVocabulary() {
    try {
        console.log("Starting vocabulary migration...");

        // 1. Fetch all lessons from Supabase directly
        const { data: lessons, error } = await supabase
            .from('lessons')
            .select('id, course_id, content_json');

        if (error || !lessons) {
            throw new Error("Failed to fetch lessons: " + error?.message);
        }

        console.log(`Found ${lessons.length} lessons to migrate.`);

        let successCount = 0;
        let failCount = 0;

        // 2. Iterate and Re-save
        // This triggers the new saveLessonContent logic which:
        // - Extracts vocabulary
        // - Upserts to 'vocabulary' table
        // - Updates 'lessons' JSON to remove definitions
        for (const lessonRow of lessons) {
            const lessonData = lessonRow.content_json as LessonData;
            const courseId = lessonRow.course_id;

            try {
                // We must import saveLessonContent dynamically or ensure no circular dep issues?
                // Importing at top level is fine as they are in same module usually or separate files.
                // We already imported LessonData, let's assume we can import saveLessonContent from lesson-actions.
                const { saveLessonContent } = await import('./lesson-actions');

                await saveLessonContent(lessonData, courseId);
                successCount++;
            } catch (e) {
                console.error(`Failed to migrate lesson ${lessonRow.id}:`, e);
                failCount++;
            }
        }

        return { success: true, message: `Vocabulary migration complete. Processed: ${successCount}, Failed: ${failCount}` };
    } catch (error: any) {
        console.error("Migration fatal error:", error);
        return { success: false, error: error.message };
    }
}
