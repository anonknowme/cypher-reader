import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { getLessonsV3Mock } from '@/actions/course-actions';
import { LearnClient } from './LearnClient';

export default async function LearnLessonPage({
    params
}: {
    params: Promise<{ courseId: string; sectionId: string; lessonId: string }>
}) {
    const { courseId, sectionId, lessonId } = await params;

    const lessons = await getLessonsV3Mock(sectionId);
    const lesson = lessons.find(l => l.id === lessonId);

    if (!lesson) {
        return (
            <div className="min-h-screen bg-background-level0 flex flex-col items-center justify-center p-6 space-y-4">
                <p className="text-semantic-red font-medium">Lesson Not Found</p>
                <Link href={`/learn/${courseId}/${sectionId}`}>
                    <Button variant="primary">Back to Lessons</Button>
                </Link>
            </div>
        );
    }

    // Convert V3Mock data to LessonData format expected by LearnClient
    const lessonData = {
        original_text: lesson.original_text,
        translation_kr: lesson.translation_kr,
        context_desc: lesson.context_desc,
        chunks: lesson.chunks.map(c => ({ en: c.en, kr: c.kr })),
        vocabulary: lesson.vocabulary.map(v => ({
            word: v.word,
            definition: v.definition,
            lemma: v.lemma,
            level: v.level
        })),
        quizzes: lesson.quizzes.map(q => ({
            segments: q.question,
            correctAnswers: q.answer,
            distractors: q.options || []
        }))
    };

    return <LearnClient slug={`${courseId}/${sectionId}`} lessonId={lessonId} lessonData={lessonData} />;
}
