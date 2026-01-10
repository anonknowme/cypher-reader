'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { getCourseProgress, clearCourseProgress, LessonProgress } from '@/lib/progress';

interface LessonSummary {
    hash: string;
    original_text: string;
    trans_kr: string;
}

interface CourseLessonListProps {
    courseId: string;
    lessons: LessonSummary[];
}

export function CourseLessonList({ courseId, lessons }: CourseLessonListProps) {
    const [progressMap, setProgressMap] = useState<Record<string, LessonProgress>>({});
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Hydrate progress on mount
        const courseProgress = getCourseProgress(courseId);
        if (courseProgress) {
            setProgressMap(courseProgress.lessons);
        }
        setIsLoaded(true);
    }, [courseId]);

    const handleReset = () => {
        if (confirm('모든 학습 기록을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            clearCourseProgress(courseId);
            setProgressMap({});
        }
    };

    // Calculate total progress
    const completedCount = Object.values(progressMap).filter(l => l.status === 'completed').length;
    const progressPercent = Math.round((completedCount / lessons.length) * 100);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-title3 font-bold">커리큘럼 (총 {lessons.length}강)</h2>
                {isLoaded && completedCount > 0 && (
                    <Badge color="accent" variant="soft">진행률 {progressPercent}%</Badge>
                )}
            </div>

            <div className="grid gap-4">
                {lessons.map((lesson, idx) => {
                    const progress = progressMap[lesson.hash];
                    const isCompleted = progress?.status === 'completed';
                    const isInProgress = progress?.status === 'in-progress';

                    // Lock logic: Unlocked if it's the first lesson OR previous lesson is completed
                    const prevLessonHash = idx > 0 ? lessons[idx - 1].hash : null;
                    const prevLessonProgress = prevLessonHash ? progressMap[prevLessonHash] : null;
                    const isLocked = idx > 0 && prevLessonProgress?.status !== 'completed';

                    const CardContent = (
                        <Card
                            level="1"
                            padding="medium"
                            className={`
                                transition-all 
                                ${isLocked
                                    ? 'bg-background-level1 opacity-60 grayscale cursor-not-allowed'
                                    : `hover:shadow-medium group-hover:-translate-y-1 ${isCompleted ? 'border-accent-default/50 bg-accent-default/5' : 'hover:bg-background-secondary hover:border-accent-default'}`
                                }
                            `}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`
                                    w-12 h-12 rounded-full flex items-center justify-center text-title3 font-bold flex-shrink-0 transition-colors
                                    ${isLocked
                                        ? 'bg-background-tertiary text-foreground-tertiary'
                                        : isCompleted
                                            ? 'bg-accent-default text-white'
                                            : 'bg-background-tertiary text-foreground-tertiary group-hover:bg-accent-default group-hover:text-white'
                                    }
                                `}>
                                    {isCompleted ? '✓' : isLocked ? '🔒' : idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-1 gap-2">
                                        <h3 className="text-large font-bold text-foreground-primary pr-2 leading-tight break-keep line-clamp-2">
                                            Part {idx + 1}: {lesson.trans_kr || '(제목 없음)'}
                                        </h3>
                                        <div className="shrink-0">
                                            {isCompleted ? (
                                                <Badge color="green" variant="soft">완료됨</Badge>
                                            ) : isInProgress ? (
                                                <Badge color="orange" variant="soft">{progress.lastStep} / {progress.totalSteps} 단계</Badge>
                                            ) : isLocked ? (
                                                <Badge color="gray" variant="soft">잠김</Badge>
                                            ) : (
                                                <Badge color="gray" variant="outline">학습 전</Badge>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-small text-foreground-secondary font-serif line-clamp-2">
                                        {lesson.original_text}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    );

                    if (isLocked) {
                        return (
                            <div key={lesson.hash} className="block select-none">
                                {CardContent}
                            </div>
                        );
                    }

                    return (
                        <Link key={lesson.hash} href={`/courses/${courseId}/learn/${lesson.hash}`} className="block group">
                            {CardContent}
                        </Link>
                    );
                })}
            </div>

            {isLoaded && Object.keys(progressMap).length > 0 && (
                <div className="flex justify-center pt-8 border-t border-dashed border-background-tertiary">
                    <button
                        onClick={handleReset}
                        className="text-small text-foreground-tertiary hover:text-semantic-red transition-colors underline decoration-dashed underline-offset-4"
                    >
                        학습 기록 초기화
                    </button>
                </div>
            )}
        </div>
    );
}
