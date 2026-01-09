import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { getCourse } from '@/actions/course-actions';
import { getLessonSummaries } from '@/actions/lesson-actions';

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const course = await getCourse(slug);

    if (!course) {
        return (
            <div className="min-h-screen bg-background-level0 p-page-padding-block flex flex-col items-center justify-center space-y-4">
                <h1 className="text-title1 font-bold">Course Not Found</h1>
                <Link href="/">
                    <Button variant="primary">Return Home</Button>
                </Link>
            </div>
        );
    }

    // Fetch summaries for all lessons in one go (Server-side)
    const lessons = await getLessonSummaries(course.lessons, slug);

    return (
        <div className="min-h-screen bg-background-level0 py-page-padding-block px-page-padding-inline font-regular text-foreground-primary">
            <div className="max-w-3xl mx-auto space-y-8">

                {/* Header */}
                <header className="space-y-4">
                    <Link href="/" className="inline-flex items-center gap-2 text-foreground-tertiary hover:text-foreground-primary transition-colors mb-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        서재로 돌아가기
                    </Link>
                    <div className="space-y-2">
                        <Badge color="orange" variant="soft">코스 (Course)</Badge>
                        <h1 className="text-display font-black leading-tight break-keep">{course.title}</h1>
                        <p className="text-large text-foreground-secondary leading-relaxed max-w-2xl break-keep">
                            {course.description}
                        </p>
                    </div>
                </header>

                {/* Lesson List */}
                <main className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-title3 font-bold">커리큘럼 (총 {lessons.length}강)</h2>
                    </div>

                    <div className="grid gap-4">
                        {lessons.map((lesson, idx) => (
                            <Link key={lesson.hash} href={`/courses/${slug}/learn/${lesson.hash}`} className="block group">
                                <Card level="1" padding="medium" className="transition-all hover:bg-background-secondary hover:border-accent-default hover:shadow-medium group-hover:-translate-y-1">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-background-tertiary flex items-center justify-center text-title3 font-bold text-foreground-tertiary group-hover:bg-accent-default group-hover:text-white transition-colors flex-shrink-0">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between mb-1 gap-2">
                                                <h3 className="text-large font-bold text-foreground-primary pr-2 leading-tight break-keep line-clamp-2">
                                                    Part {idx + 1}: {lesson.trans_kr || '(제목 없음)'}
                                                </h3>
                                                <Badge color={idx === 0 ? "green" : "gray"} variant="outline" className="shrink-0">
                                                    {idx === 0 ? "학습하기" : "잠금됨"}
                                                </Badge>
                                            </div>
                                            <p className="text-small text-foreground-secondary font-serif line-clamp-2">
                                                {lesson.original_text}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </main>

            </div>
        </div>
    );
}
