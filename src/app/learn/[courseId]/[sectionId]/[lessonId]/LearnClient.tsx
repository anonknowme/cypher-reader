'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDonationPrompt } from '@/contexts/DonationPromptContext';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { ProgressBar } from '@/components/ProgressBar';
import { LessonData } from '@/actions/lesson-actions';
import { saveLessonProgress, getLessonProgress } from '@/lib/progress';

// Import step components
import {
    ContextStep,
    ReadingStep,
    ListeningStep,
    SpeakingStep,
    QuizStep,
    TypingStep,
    QuizState
} from '@/components/learn';

interface LearnClientProps {
    slug: string;
    lessonId: string;
    lessonData: LessonData;
}

export function LearnClient({ slug, lessonId, lessonData }: LearnClientProps) {
    const router = useRouter();
    const { triggerPrompt } = useDonationPrompt();

    const [activeStep, setActiveStep] = useState(1);
    const totalSteps = 6;
    const data = lessonData;

    // Lifted State
    const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
    const [chunkInputs, setChunkInputs] = useState<string[]>([]);
    const [showDefinitions, setShowDefinitions] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState<number>(-1);

    // Quiz State
    const quizzes = data.quizzes || (data.quiz ? [data.quiz] : []);
    const [activeQuizIndex, setActiveQuizIndex] = useState(0);
    const [quizStates, setQuizStates] = useState<QuizState[]>([]);

    // Initialize quiz options when data loads
    useEffect(() => {
        if (quizzes.length > 0) {
            const initialStates = quizzes.map(q => ({
                filledBlanks: new Array(q.correctAnswers.length).fill(null),
                options: [...q.correctAnswers, ...q.distractors].sort(() => Math.random() - 0.5)
            }));
            setQuizStates(initialStates);
        }
    }, [data]);

    // Hydrate chunk inputs from saved progress
    useEffect(() => {
        const saved = getLessonProgress(slug, lessonId);
        if (saved?.data?.chunkInputs) {
            setChunkInputs(saved.data.chunkInputs);
        }
    }, [slug, lessonId]);

    // Save chunk inputs when they change (debounced)
    useEffect(() => {
        if (activeStep !== 6) return;

        const timer = setTimeout(() => {
            saveLessonProgress(slug, lessonId, activeStep, totalSteps, { chunkInputs });
        }, 1000);

        return () => clearTimeout(timer);
    }, [chunkInputs, activeStep, slug, lessonId, totalSteps]);

    // Check quiz completion
    const currentQuizState = quizStates[activeQuizIndex];
    const currentQuiz = quizzes[activeQuizIndex];
    const isAllQuizzesComplete = quizzes.every((q, idx) => {
        const state = quizStates[idx];
        return state?.filledBlanks.every((b, i) => b === q.correctAnswers[i]);
    });

    // Navigation
    const nextStep = () => {
        if (activeStep === 5 && quizzes.length > 0 && activeQuizIndex < quizzes.length - 1) {
            setActiveQuizIndex(activeQuizIndex + 1);
        } else {
            setActiveStep(prev => Math.min(prev + 1, totalSteps));
        }
    };

    const prevStep = () => {
        setActiveStep(prev => Math.max(prev - 1, 1));
    };

    // Auto-scroll to top when activeStep changes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [activeStep]);

    // Refs for typing step
    const chunkRefs = useRef<(HTMLDivElement | null)[]>([]);
    const inputRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

    useEffect(() => {
        chunkRefs.current = chunkRefs.current.slice(0, data.chunks.length);
        inputRefs.current = inputRefs.current.slice(0, data.chunks.length);
    }, [data.chunks]);

    const handleChunkFocus = (index: number) => {
        const element = chunkRefs.current[index];
        if (element) {
            setTimeout(() => {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    };

    // Check if all chunks match (Cleaned & Case-Insensitive)
    const cleanText = (str: string) => str.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, " ");
    const isStep6Complete = data.chunks.every((chunk, idx) => {
        const userValue = chunkInputs[idx] || '';
        const targetText = cleanText(chunk.en);
        return userValue.toLowerCase().trim() === targetText.toLowerCase().trim();
    });

    const handleFinish = () => {
        if (!isStep6Complete) {
            alert("모든 문장을 올바르게 따라 써주세요.");
            return;
        }
        saveLessonProgress(slug, lessonId, totalSteps + 1, totalSteps, { chunkInputs });
        triggerPrompt();
        router.push(`/learn/${slug}`);
    };

    return (
        <div className="min-h-screen bg-background-level0 py-page-padding-block px-page-padding-inline font-regular text-foreground-primary">
            <div className="max-w-2xl mx-auto space-y-8">

                {/* Header & Progress */}
                <header className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href={`/learn/${slug}`} className="p-2 -ml-2 text-foreground-tertiary hover:text-foreground-primary transition-colors">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                            </Link>
                            <Badge color="accent" variant="soft">학습 중</Badge>
                        </div>
                        <span className="text-small text-foreground-tertiary">{activeStep} / {totalSteps} 단계</span>
                    </div>
                    <ProgressBar
                        currentStep={activeStep}
                        totalSteps={totalSteps}
                        onStepClick={(step) => {
                            setHighlightIndex(-1);
                            setActiveStep(step);
                        }}
                    />
                </header>

                {/* Main Content Area (Wizard) */}
                <main className="min-h-[400px]">
                    {activeStep === 1 && <ContextStep data={data} />}

                    {activeStep === 2 && (
                        <ReadingStep
                            data={data}
                            showDefinitions={showDefinitions}
                            setShowDefinitions={setShowDefinitions}
                        />
                    )}

                    {activeStep === 3 && (
                        <ListeningStep
                            data={data}
                            highlightIndex={highlightIndex}
                            setHighlightIndex={setHighlightIndex}
                        />
                    )}

                    {activeStep === 4 && (
                        <SpeakingStep
                            data={data}
                            recordingUrl={recordingUrl}
                            setRecordingUrl={setRecordingUrl}
                        />
                    )}

                    {activeStep === 5 && (
                        <QuizStep
                            data={data}
                            quizzes={quizzes}
                            quizStates={quizStates}
                            setQuizStates={setQuizStates}
                            activeQuizIndex={activeQuizIndex}
                            setActiveQuizIndex={setActiveQuizIndex}
                        />
                    )}

                    {activeStep === 6 && (
                        <TypingStep
                            data={data}
                            chunkInputs={chunkInputs}
                            setChunkInputs={setChunkInputs}
                            chunkRefs={chunkRefs}
                            inputRefs={inputRefs}
                            onChunkFocus={handleChunkFocus}
                        />
                    )}
                </main>

                {/* Footer Controls */}
                <footer className="flex justify-between pt-8 border-t border-border-primary/50">
                    <Button
                        variant="secondary"
                        onClick={prevStep}
                        disabled={activeStep === 1}
                    >
                        이전 단계
                    </Button>
                    {activeStep < totalSteps ? (
                        <Button variant="primary" onClick={nextStep} disabled={activeStep === 5 && !isAllQuizzesComplete}>
                            다음 단계
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            onClick={handleFinish}
                            disabled={!isStep6Complete}
                            className={!isStep6Complete ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                            다음 레슨으로 넘어가기
                        </Button>
                    )}
                </footer>

            </div>
        </div>
    );
}
