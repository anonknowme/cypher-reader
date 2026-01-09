import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { getLessonContent } from '@/actions/lesson-actions';
import { LearnClient } from './LearnClient';

export default async function LearnPage({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
    const { slug, lessonId } = await params;

    const data = await getLessonContent(lessonId, slug);

    if (!data) {
        return (
            <div className="min-h-screen bg-background-level0 flex flex-col items-center justify-center p-6 space-y-4">
                <p className="text-semantic-red font-medium">데이터를 불러올 수 없습니다. (Lesson Not Found)</p>
                <Link href={`/courses/${slug}`}>
                    <Button variant="primary">코스로 돌아가기</Button>
                </Link>
            </div>
        );
    }

    return <LearnClient slug={slug} lessonId={lessonId} lessonData={data} />;
}
