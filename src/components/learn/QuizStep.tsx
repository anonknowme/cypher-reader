'use client';

import React from 'react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import type { QuizStepProps, Quiz, QuizState } from './types';

/**
 * Step 5: Quiz (Fill-in-the-blank)
 * 
 * Interactive quiz with drag-and-drop style word selection.
 */
export function QuizStep({
    data,
    quizzes,
    quizStates,
    setQuizStates,
    activeQuizIndex,
    setActiveQuizIndex
}: QuizStepProps) {
    const currentQuiz: Quiz | undefined = quizzes[activeQuizIndex];
    const currentQuizState: QuizState | undefined = quizStates[activeQuizIndex];

    // Check if current quiz is complete
    const isCurrentQuizComplete = currentQuizState?.filledBlanks.every(
        (b, i) => b === currentQuiz?.correctAnswers[i]
    ) ?? false;

    // Handle clicking an option word
    const handleOptionClick = (word: string) => {
        if (!currentQuizState) return;
        const firstEmptyIndex = currentQuizState.filledBlanks.findIndex(b => b === null);
        if (firstEmptyIndex === -1) return;

        const newStates = [...quizStates];
        newStates[activeQuizIndex] = {
            ...currentQuizState,
            filledBlanks: currentQuizState.filledBlanks.map((b, i) =>
                i === firstEmptyIndex ? word : b
            )
        };
        setQuizStates(newStates);
    };

    // Handle clicking a filled blank to remove it
    const handleBlankClick = (index: number) => {
        if (!currentQuizState || currentQuizState.filledBlanks[index] === null) return;

        const newStates = [...quizStates];
        newStates[activeQuizIndex] = {
            ...currentQuizState,
            filledBlanks: currentQuizState.filledBlanks.map((b, i) =>
                i === index ? null : b
            )
        };
        setQuizStates(newStates);
    };

    return (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Badge color="gray" variant="outline">5단계</Badge>
                    <h2 className="text-title3 font-bold">쓰기 (빈칸 퀴즈)</h2>
                </div>
                <Badge color="blue" variant="soft">{activeQuizIndex + 1} / {quizzes.length}</Badge>
            </div>

            {currentQuiz && currentQuizState ? (
                <div className="space-y-6">
                    <Card level="1" padding="medium" className={`bg-background-secondary/50 min-h-[120px] flex items-center justify-center transition-colors duration-300 ${isCurrentQuizComplete ? 'border-semantic-green bg-semantic-green/5' : ''}`}>
                        <p className="text-large font-serif leading-loose text-foreground-primary text-center">
                            {currentQuiz.segments.map((seg, i) => {
                                if (seg.type === 'text') return <span key={i}>{seg.content}</span>;
                                const id = seg.id !== undefined ? seg.id : -1;
                                const isFilled = currentQuizState.filledBlanks[id] !== null;
                                const isCorrect = currentQuizState.filledBlanks[id] === currentQuiz.correctAnswers[id];

                                return (
                                    <button
                                        key={i}
                                        onClick={() => handleBlankClick(id)}
                                        className={`
                                            inline-block min-w-[80px] border-b-2 mx-1 px-2 text-center transition-all
                                            ${isFilled
                                                ? (isCorrect ? 'border-semantic-green text-semantic-green font-bold' : 'border-semantic-red text-semantic-red')
                                                : 'border-foreground-tertiary/50 text-foreground-tertiary bg-background-tertiary/50'}
                                        `}
                                    >
                                        {currentQuizState.filledBlanks[id] || "_"}
                                    </button>
                                );
                            })}
                        </p>
                    </Card>

                    <div className="bg-background-level2 p-4 rounded-16 border border-border-secondary">
                        <p className="text-small text-foreground-tertiary mb-3 text-center">빈칸에 들어갈 단어를 순서대로 채우세요</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {currentQuizState.options.map((option, idx) => {
                                const isUsed = currentQuizState.filledBlanks.includes(option);
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => !isUsed && handleOptionClick(option)}
                                        disabled={isUsed}
                                        className={`
                                            px-4 py-2 rounded-full text-regular font-medium font-serif border transition-all
                                            ${isUsed
                                                ? 'bg-background-tertiary text-foreground-tertiary border-transparent opacity-50 cursor-not-allowed'
                                                : 'bg-background-level1 text-foreground-primary border-border-primary hover:border-accent-default hover:text-accent-default shadow-low'}
                                        `}
                                    >
                                        {option}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-between">
                        <Button
                            variant="secondary"
                            onClick={() => setActiveQuizIndex(Math.max(0, activeQuizIndex - 1))}
                            disabled={activeQuizIndex === 0}
                        >
                            Prev Quiz
                        </Button>
                        <Button
                            variant={isCurrentQuizComplete ? 'primary' : 'ghost'}
                            onClick={() => setActiveQuizIndex(Math.min(quizzes.length - 1, activeQuizIndex + 1))}
                            disabled={activeQuizIndex === quizzes.length - 1 || !isCurrentQuizComplete}
                        >
                            Next Quiz
                        </Button>
                    </div>
                </div>
            ) : (
                <p>No Quiz Data</p>
            )}
        </section>
    );
}
