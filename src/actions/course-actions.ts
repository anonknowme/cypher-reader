'use server';

import { supabase } from '@/lib/supabase';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export interface CourseData {
    id: string; // This is the slug (filename)
    title: string;
    description: string;
    img_url?: string;
    lessons: string[]; // Array of hashes
}

export async function getAllCourses(): Promise<CourseData[]> {
    try {
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .order('title'); // Or created_at, up to preference

        if (error) {
            console.error('Error fetching courses:', error);
            return [];
        }

        // Map DB fields to CourseData interface if names differed, but they match exactly here.
        // DB: id, title, description, img_url, lesson_order
        return data.map(row => ({
            id: row.id,
            title: row.title,
            description: row.description,
            img_url: row.img_url,
            lessons: row.lesson_order || []
        }));
    } catch (e) {
        console.error('Unexpected error fetching courses:', e);
        return [];
    }
}

export async function createCourse(data: CourseData) {
    if (!data.id || !data.title) throw new Error("Invalid course data");

    const { error } = await getSupabaseAdmin()
        .from('courses')
        .insert({
            id: data.id,
            title: data.title,
            description: data.description,
            img_url: data.img_url,
            lesson_order: data.lessons
        });

    if (error) {
        if (error.code === '23505') { // Unique violation
            throw new Error("Course already exists");
        }
        throw error;
    }

    return { success: true, id: data.id };
}

export async function addLessonToCourse(courseId: string, lessonHash: string) {
    // We need to append to the array.
    // Supabase doesn't have a simple "array_append" via JS client without RPC or reading first.
    // Safe approach: Read -> Modify -> Write (Checking for race conditions if needed, but low traffic)

    const { data: course, error: fetchError } = await supabase
        .from('courses')
        .select('lesson_order')
        .eq('id', courseId)
        .single();

    if (fetchError || !course) {
        return { success: false, error: 'Course not found' };
    }

    const currentLessons = course.lesson_order || [];
    if (!currentLessons.includes(lessonHash)) {
        const updatedLessons = [...currentLessons, lessonHash];

        const { error: updateError } = await getSupabaseAdmin()
            .from('courses')
            .update({ lesson_order: updatedLessons })
            .eq('id', courseId);

        if (updateError) return { success: false, error: updateError.message };
    }

    return { success: true };
}

export async function getCourse(slug: string): Promise<CourseData | null> {
    const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', slug)
        .single();

    if (error || !data) {
        return null;
    }

    return {
        id: data.id,
        title: data.title,
        description: data.description,
        img_url: data.img_url,
        lessons: data.lesson_order || []
    };
}

export async function updateCourseLesson(courseId: string, oldHash: string, newHash: string) {
    const { data: course, error: fetchError } = await supabase
        .from('courses')
        .select('lesson_order')
        .eq('id', courseId)
        .single();

    if (fetchError || !course) {
        return { success: false, error: 'Course not found' };
    }

    const currentLessons = course.lesson_order || [];
    const index = currentLessons.indexOf(oldHash);

    if (index !== -1) {
        const updatedLessons = [...currentLessons];
        updatedLessons[index] = newHash;

        const { error: updateError } = await getSupabaseAdmin()
            .from('courses')
            .update({ lesson_order: updatedLessons })
            .eq('id', courseId);

        if (updateError) return { success: false, error: updateError.message };
        return { success: true };
    }

    return { success: false, error: 'Lesson not found in course' };
}

