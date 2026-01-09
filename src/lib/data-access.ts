import fs from 'fs/promises';
import path from 'path';

export const DATA_DIR = path.join(process.cwd(), 'data', 'lessons');
export const COURSES_DIR = path.join(process.cwd(), 'data', 'courses');

export async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

export async function ensureCoursesDir() {
    try {
        await fs.access(COURSES_DIR);
    } catch {
        await fs.mkdir(COURSES_DIR, { recursive: true });
    }
}
