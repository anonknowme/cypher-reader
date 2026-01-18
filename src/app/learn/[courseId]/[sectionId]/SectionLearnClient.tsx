'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { AudioPlayer } from '@/components/AudioPlayer';
import { TextArea } from '@/components/TextArea';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { TypingFeedback } from '@/components/TypingFeedback';
import { WordWithDefinition } from '@/components/WordWithDefinition';
import type { LessonWithChildrenV3Mock } from '@/actions/course-actions';

interface SectionLearnClientProps {
    courseId: string;
    sectionId: string;
    sectionTitle: string;
    courseTitle: string;
    lessons: LessonWithChildrenV3Mock[];
}

export function SectionLearnClient({
    courseId,
    sectionId,
    sectionTitle,
    courseTitle,
    lessons
}: SectionLearnClientProps) {
    // State for each lesson's steps
    const [lessonStates, setLessonStates] = useState<{
        [lessonId: string]: {
            activeStep: number;
            recordingUrl: string | null;
            chunkInputs: string[];
            showDefinitions: boolean;
            highlightIndex: number;
            quizStates: Array<{ filledBlanks: (string | null)[], options: string[] }>;
            activeQuizIndex: number;
        }
    }>({});

    // Initialize state for all lessons
    useEffect(() => {
        const initialStates: typeof lessonStates = {};
        lessons.forEach(lesson => {
            const quizStates = lesson.quizzes.map(q => ({
                filledBlanks: new Array(q.answer.length).fill(null),
                options: [...q.answer, ...(q.options || [])].sort(() => Math.random() - 0.5)
            }));

            initialStates[lesson.id] = {
                activeStep: 1,
                recordingUrl: null,
                chunkInputs: new Array(lesson.chunks.length).fill(''),
                showDefinitions: false,
                highlightIndex: -1,
                quizStates,
                activeQuizIndex: 0
            };
        });
        setLessonStates(initialStates);
    }, [lessons]);

    const updateLessonState = (lessonId: string, updates: Partial<typeof lessonStates[string]>) => {
        setLessonStates(prev => ({
            ...prev,
            [lessonId]: { ...prev[lessonId], ...updates }
        }));
    };

    // Helper to render text with vocabulary highlighting
    const renderChunkWithVocab = (text: string, vocabulary: any[], showDefinitions: boolean) => {
        const sortedVocab = [...vocabulary]
            .filter(v => v.word && v.word.trim().length > 0)
            .sort((a, b) => b.word.length - a.word.length);

        const pattern = new RegExp(`\\b(${sortedVocab.map(v => v.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');

        const parts = [];
        let lastIndex = 0;

        text.replace(pattern, (match, p1, offset) => {
            if (offset > lastIndex) {
                parts.push(text.slice(lastIndex, offset));
            }

            const vocabItem = sortedVocab.find(v => v.word.toLowerCase() === match.toLowerCase()) ||
                sortedVocab.find(v => match.toLowerCase().includes(v.word.toLowerCase()));

            if (vocabItem) {
                parts.push(<WordWithDefinition key={offset} word={match} def={vocabItem.definition} showAlways={showDefinitions} />);
            } else {
                parts.push(match);
            }

            lastIndex = offset + match.length;
            return match;
        });

        if (lastIndex < text.length) {
            parts.push(text.slice(lastIndex));
        }

        return parts.length > 0 ? parts : [text];
    };

    // Helper to render karaoke text
    const renderKaraokeText = (text: string, currentIndex: number) => {
        const words = text.split(' ');
        let charCount = 0;

        return (
            <span className="text-title2 font-serif font-medium text-foreground-secondary leading-relaxed">
                {words.map((word, i) => {
                    const wordStart = charCount;
                    const wordEnd = wordStart + word.length;
                    const isHighlighted = currentIndex >= wordStart && currentIndex < wordEnd;
                    charCount += word.length + 1;

                    return (
                        <span key={i} className={`transition-colors duration-200 ${isHighlighted ? 'text-accent-default scale-105 inline-block' : 'opacity-100'}`}>
                            {word}{' '}
                        </span>
                    );
                })}
            </span>
        );
    };

    if (Object.keys(lessonStates).length === 0) {
        return <div>Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-background-level0 py-page-padding-block px-page-padding-inline font-regular text-foreground-primary">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <header className="space-y-4">
                    <Link
                        href={`/learn/${courseId}`}
                        className="inline-flex items-center gap-2 text-foreground-tertiary hover:text-foreground-primary transition-colors mb-2"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Back to Sections
                    </Link>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Badge color="orange" variant="soft">Section</Badge>
                            <Badge color="gray" variant="outline">{lessons.length} Lessons</Badge>
                        </div>
                        <h1 className="text-display font-black leading-tight break-keep">{sectionTitle}</h1>
                        <p className="text-regular text-foreground-tertiary">
                            {courseTitle}
                        </p>
                    </div>
                </header>

                {/* Continuous Lessons */}
                <main className="space-y-16">
                    {lessons.map((lesson, lessonIdx) => {
                        const state = lessonStates[lesson.id];
                        if (!state) return null;

                        const currentQuiz = lesson.quizzes[state.activeQuizIndex];
                        const currentQuizState = state.quizStates[state.activeQuizIndex];

                        return (
                            <article
                                key={lesson.id}
                                className="scroll-mt-24 space-y-8"
                                id={`lesson-${lesson.order}`}
                            >
                                {/* Lesson Header */}
                                <div className="flex items-center gap-3 pb-4 border-b-2 border-accent-default/20">
                                    <Badge color="blue" variant="soft">Lesson {lesson.order}</Badge>
                                    <h2 className="text-title1 font-bold">{lesson.title || `Lesson ${lesson.order}`}</h2>
                                </div>

                                {/* Step Progress */}
                                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                                    {[1, 2, 3, 4, 5, 6].map(step => (
                                        <button
                                            key={step}
                                            onClick={() => updateLessonState(lesson.id, { activeStep: step })}
                                            className={`px-4 py-2 rounded-full text-small font-medium transition-all whitespace-nowrap ${state.activeStep === step
                                                ? 'bg-accent-default text-white shadow-low'
                                                : 'bg-background-secondary text-foreground-tertiary hover:bg-background-tertiary'
                                                }`}
                                        >
                                            Step {step}
                                        </button>
                                    ))}
                                </div>

                                {/* Step Content */}
                                <div className="min-h-[400px]">
                                    {/* Step 1: Context */}
                                    {state.activeStep === 1 && (
                                        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="flex items-center gap-2">
                                                <Badge color="gray" variant="outline">1단계</Badge>
                                                <h3 className="text-title3 font-bold">배경 이해하기</h3>
                                            </div>
                                            <Card level="1" padding="large" className="space-y-6">
                                                {lesson.context_desc && (
                                                    <div className="space-y-2">
                                                        <Badge color="orange" variant="soft">핵심 개념</Badge>
                                                        <p className="text-regular text-foreground-primary leading-relaxed">
                                                            {lesson.context_desc}
                                                        </p>
                                                    </div>
                                                )}
                                                <div className="h-px bg-border-secondary" />
                                                <div className="space-y-2">
                                                    <Badge color="green" variant="soft">한글 번역</Badge>
                                                    <p className="text-title3 font-medium text-foreground-primary leading-relaxed">
                                                        {lesson.translation_kr}
                                                    </p>
                                                </div>
                                                <div className="h-px bg-border-secondary" />
                                                <div className="space-y-2">
                                                    <Badge color="blue" variant="soft">영어 원문</Badge>
                                                    <p className="text-large font-serif font-medium text-foreground-secondary leading-relaxed">
                                                        "{lesson.original_text}"
                                                    </p>
                                                </div>
                                            </Card>
                                        </section>
                                    )}

                                    {/* Step 2: Reading */}
                                    {state.activeStep === 2 && (
                                        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Badge color="gray" variant="outline">2단계</Badge>
                                                    <h3 className="text-title3 font-bold">원문 읽기</h3>
                                                </div>
                                                <button
                                                    onClick={() => updateLessonState(lesson.id, { showDefinitions: !state.showDefinitions })}
                                                    className={`text-small font-medium px-3 py-1.5 rounded-full transition-colors ${!state.showDefinitions
                                                        ? 'bg-accent-default text-white shadow-low hover:bg-accent-hover'
                                                        : 'bg-background-tertiary text-foreground-secondary hover:bg-background-quaternary'
                                                        }`}
                                                >
                                                    단어 뜻 {state.showDefinitions ? '숨기기' : '보기'}
                                                </button>
                                            </div>
                                            <Card level="2" padding="large" className="border-accent-default/20 space-y-8">
                                                {lesson.chunks.map((chunk, idx) => (
                                                    <React.Fragment key={chunk.order}>
                                                        <div className="flex flex-col gap-3">
                                                            <Badge color="blue" variant="soft">끊어읽기 {chunk.order}</Badge>
                                                            <p className="text-title3 font-serif text-foreground-primary leading-[3]">
                                                                {renderChunkWithVocab(chunk.en, lesson.vocabulary, state.showDefinitions)}
                                                            </p>
                                                            <p className="text-regular text-foreground-secondary font-medium pl-1 border-l-2 border-accent-default/20">
                                                                {chunk.kr}
                                                            </p>
                                                        </div>
                                                        {idx < lesson.chunks.length - 1 && <div className="h-px bg-border-primary border-t border-dashed" />}
                                                    </React.Fragment>
                                                ))}
                                            </Card>
                                        </section>
                                    )}

                                    {/* Step 3: Listening */}
                                    {state.activeStep === 3 && (
                                        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="flex items-center gap-2">
                                                <Badge color="gray" variant="outline">3단계</Badge>
                                                <h3 className="text-title3 font-bold">원문 듣기</h3>
                                            </div>
                                            <AudioPlayer
                                                text={lesson.original_text}
                                                onBoundary={(index) => updateLessonState(lesson.id, { highlightIndex: index })}
                                                onEnd={() => updateLessonState(lesson.id, { highlightIndex: -1 })}
                                            />
                                            <Card level="2" padding="large" className="bg-background-secondary/50 min-h-[120px] flex items-center justify-center">
                                                {renderKaraokeText(lesson.original_text, state.highlightIndex)}
                                            </Card>
                                        </section>
                                    )}

                                    {/* Step 4: Speaking */}
                                    {state.activeStep === 4 && (
                                        <section className="space-y-6 animate-in fade-in-slide-in-from-bottom-4 duration-500">
                                            <div className="flex items-center gap-2">
                                                <Badge color="gray" variant="outline">4단계</Badge>
                                                <h3 className="text-title3 font-bold">말하기</h3>
                                            </div>
                                            <Card level="1" className="flex flex-col items-center justify-center p-0 overflow-hidden">
                                                <VoiceRecorder
                                                    audioURL={state.recordingUrl}
                                                    onRecordingComplete={(url) => updateLessonState(lesson.id, { recordingUrl: url })}
                                                />
                                            </Card>
                                            <Card level="2" padding="large">
                                                <p className="text-title2 font-serif font-medium text-foreground-primary leading-relaxed">
                                                    "{lesson.original_text}"
                                                </p>
                                            </Card>
                                        </section>
                                    )}

                                    {/* Step 5: Quiz - Placeholder for now */}
                                    {state.activeStep === 5 && (
                                        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="flex items-center gap-2">
                                                <Badge color="gray" variant="outline">5단계</Badge>
                                                <h3 className="text-title3 font-bold">쓰기 (빈칸 퀴즈)</h3>
                                            </div>
                                            <Card level="1" padding="large" className="text-center py-12">
                                                <p className="text-foreground-tertiary">Quiz functionality coming soon...</p>
                                            </Card>
                                        </section>
                                    )}

                                    {/* Step 6: Typing - Placeholder for now */}
                                    {state.activeStep === 6 && (
                                        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="flex items-center gap-2">
                                                <Badge color="gray" variant="outline">6단계</Badge>
                                                <h3 className="text-title3 font-bold">쓰기 (따라 쓰기)</h3>
                                            </div>
                                            <Card level="1" padding="large" className="text-center py-12">
                                                <p className="text-foreground-tertiary">Typing practice coming soon...</p>
                                            </Card>
                                        </section>
                                    )}
                                </div>

                                {/* Lesson Navigation */}
                                <div className="flex justify-between pt-4">
                                    <Button
                                        variant="secondary"
                                        onClick={() => updateLessonState(lesson.id, { activeStep: Math.max(1, state.activeStep - 1) })}
                                        disabled={state.activeStep === 1}
                                    >
                                        이전 단계
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={() => updateLessonState(lesson.id, { activeStep: Math.min(6, state.activeStep + 1) })}
                                        disabled={state.activeStep === 6}
                                    >
                                        다음 단계
                                    </Button>
                                </div>

                                {/* Separator between lessons */}
                                {lessonIdx < lessons.length - 1 && (
                                    <div className="pt-8">
                                        <div className="h-px bg-gradient-to-r from-transparent via-border-primary to-transparent" />
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </main>

                {/* Footer Navigation */}
                <footer className="flex justify-between pt-8 border-t border-border-primary/50">
                    <Link href={`/learn/${courseId}`}>
                        <Button variant="secondary">← Back to Sections</Button>
                    </Link>
                    <Button variant="primary" disabled>
                        Next Section →
                    </Button>
                </footer>

            </div>
        </div>
    );
}
