'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { getCourseProgress, clearCourseProgress, LessonProgress } from '@/lib/progress';
import type { LessonWithChildrenV3Mock } from '@/actions/course-actions';

interface SectionLessonListProps {
    courseId: string;
    sectionId: string;
    lessons: LessonWithChildrenV3Mock[];
}

export function SectionLessonList({ courseId, sectionId, lessons }: SectionLessonListProps) {
    const [progressMap, setProgressMap] = useState<Record<string, LessonProgress>>({});
    const [isLoaded, setIsLoaded] = useState(false);
    const [devMode, setDevMode] = useState(false);

    // Use combined key for progress tracking
    const progressKey = `${courseId}/${sectionId}`;

    // Check if dev mode should be enabled (only in development)
    const isDevelopment = process.env.NODE_ENV === 'development';

    useEffect(() => {
        // Hydrate progress on mount
        const courseProgress = getCourseProgress(progressKey);
        if (courseProgress) {
            setProgressMap(courseProgress.lessons);
        }
        setIsLoaded(true);
    }, [progressKey]);

    const handleReset = () => {
        if (confirm('이 섹션의 모든 학습 기록을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            clearCourseProgress(progressKey);
            setProgressMap({});
        }
    };

    // Calculate total progress
    const completedCount = Object.values(progressMap).filter(l => l.status === 'completed').length;
    const progressPercent = Math.round((completedCount / lessons.length) * 100);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-title2 font-bold">Lessons</h2>
                <div className="flex items-center gap-2">
                    {isDevelopment && (
                        <button
                            onClick={() => setDevMode(!devMode)}
                            className={`text-mini font-medium px-3 py-1.5 rounded-full transition-colors ${devMode
                                ? 'bg-semantic-red text-white'
                                : 'bg-background-tertiary text-foreground-tertiary hover:bg-background-quaternary'
                                }`}
                        >
                            {devMode ? '🔓 Dev Mode' : '🔒 Lock Mode'}
                        </button>
                    )}
                    {isLoaded && completedCount > 0 && (
                        <Badge color="accent" variant="soft">진행률 {progressPercent}%</Badge>
                    )}
                    <Badge color="gray" variant="soft">{lessons.length} lessons</Badge>
                </div>
            </div>

            <div className="space-y-3">
                {lessons.map((lesson, idx) => {
                    const progress = progressMap[lesson.id];
                    const isCompleted = progress?.status === 'completed';
                    const isInProgress = progress?.status === 'in-progress';

                    // Lock logic: Unlocked if it's the first lesson OR previous lesson is completed OR dev mode
                    const prevLesson = idx > 0 ? lessons[idx - 1] : null;
                    const prevLessonProgress = prevLesson ? progressMap[prevLesson.id] : null;
                    // const isLocked = !devMode && idx > 0 && prevLessonProgress?.status !== 'completed';
                    const isLocked = false

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
                                    {isCompleted ? '✓' : isLocked ? '🔒' : lesson.order}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-2 gap-2">
                                        <h3 className="text-title3 font-bold text-foreground-primary group-hover:text-accent-default transition-colors leading-tight break-keep">
                                            {lesson.title || `Lesson ${lesson.order}`}
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
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge color="blue" variant="outline">{lesson.chunks.length} chunks</Badge>
                                        <Badge color="purple" variant="outline">{lesson.original_text?.trim().split(/\s+/).filter(w => w.length > 0).length || 0} words</Badge>
                                        <Badge color="green" variant="outline">{lesson.vocabulary.length} voca</Badge>
                                    </div>
                                    <p className="text-small text-foreground-tertiary line-clamp-2">
                                        {lesson.context_desc || lesson.translation_kr}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    );

                    if (isLocked) {
                        return (
                            <div key={lesson.id} className="block select-none">
                                {CardContent}
                            </div>
                        );
                    }

                    return (
                        <Link key={lesson.id} href={`/learn/${courseId}/${sectionId}/${lesson.id}`} className="block group">
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
