'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { getCourseProgress } from '@/lib/progress';
import type { SectionV3Mock } from '@/actions/course-actions';

interface SectionWithLessonCount extends SectionV3Mock {
    lessonCount: number;
}

interface SectionSelectionListProps {
    courseId: string;
    sections: SectionWithLessonCount[];
}

export function SectionSelectionList({ courseId, sections }: SectionSelectionListProps) {
    const [sectionProgressMap, setSectionProgressMap] = useState<Record<string, { completed: number, total: number }>>({});
    const [isLoaded, setIsLoaded] = useState(false);
    const [devMode, setDevMode] = useState(false);

    useEffect(() => {
        // Calculate progress for each section
        const progressMap: Record<string, { completed: number, total: number }> = {};

        sections.forEach(section => {
            const sectionKey = `${courseId}/${section.id}`;
            const courseProgress = getCourseProgress(sectionKey);

            if (courseProgress) {
                const completedCount = Object.values(courseProgress.lessons).filter(l => l.status === 'completed').length;
                progressMap[section.id] = {
                    completed: completedCount,
                    total: section.lessonCount
                };
            } else {
                progressMap[section.id] = {
                    completed: 0,
                    total: section.lessonCount
                };
            }
        });

        setSectionProgressMap(progressMap);
        setIsLoaded(true);
    }, [courseId, sections]);

    // Check if dev mode should be enabled (only in development)
    const isDevelopment = process.env.NODE_ENV === 'development';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-title2 font-bold">Sections</h2>
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
                    <Badge color="gray" variant="soft">{sections.length} chapters</Badge>
                </div>
            </div>

            <div className="space-y-3">
                {sections.map((section, idx) => {
                    const progress = sectionProgressMap[section.id];
                    const isCompleted = progress && progress.completed === progress.total && progress.total > 0;
                    const isInProgress = progress && progress.completed > 0 && progress.completed < progress.total;

                    // Lock logic: Unlocked if it's the first section OR previous section is completed OR dev mode
                    const prevSection = idx > 0 ? sections[idx - 1] : null;
                    const prevSectionProgress = prevSection ? sectionProgressMap[prevSection.id] : null;
                    const prevSectionCompleted = prevSectionProgress && prevSectionProgress.completed === prevSectionProgress.total && prevSectionProgress.total > 0;
                    // const isLocked = !devMode && idx > 0 && !prevSectionCompleted;
                    const isLocked = false

                    const progressPercent = progress ? Math.round((progress.completed / progress.total) * 100) : 0;

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
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Badge color="blue" variant="soft">Chapter {section.order}</Badge>
                                        <Badge color="gray" variant="outline">{section.lessonCount} lessons</Badge>
                                        {isLoaded && progress && progress.completed > 0 && (
                                            <Badge color={isCompleted ? 'green' : 'orange'} variant="soft">
                                                {progressPercent}%
                                            </Badge>
                                        )}
                                    </div>
                                    <h3 className="text-title3 font-bold text-foreground-primary group-hover:text-accent-default transition-colors">
                                        {section.title}
                                    </h3>
                                    {isLoaded && (
                                        <div className="mt-2">
                                            {isCompleted ? (
                                                <Badge color="green" variant="soft">✓ 완료됨</Badge>
                                            ) : isInProgress ? (
                                                <Badge color="orange" variant="soft">{progress.completed} / {progress.total} 완료</Badge>
                                            ) : isLocked ? (
                                                <Badge color="gray" variant="soft">🔒 잠김</Badge>
                                            ) : (
                                                <Badge color="gray" variant="outline">학습 전</Badge>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className={`text-foreground-tertiary transition-colors ml-4 ${!isLocked && 'group-hover:text-accent-default'}`}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </Card>
                    );

                    if (isLocked) {
                        return (
                            <div key={section.id} className="block select-none">
                                {CardContent}
                            </div>
                        );
                    }

                    return (
                        <Link key={section.id} href={`/learn/${courseId}/${section.id}`} className="block group">
                            {CardContent}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
