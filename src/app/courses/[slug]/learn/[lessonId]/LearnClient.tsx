'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { ProgressBar } from '@/components/ProgressBar';
import { AudioPlayer } from '@/components/AudioPlayer';
import { TextArea } from '@/components/TextArea';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { TypingFeedback } from '@/components/TypingFeedback';
import { LessonData } from '@/actions/lesson-actions';
import { WordWithDefinition } from '@/components/WordWithDefinition';

interface LearnClientProps {
    slug: string;
    lessonId: string;
    lessonData: LessonData;
}

export function LearnClient({ slug, lessonId, lessonData }: LearnClientProps) {
    const [activeStep, setActiveStep] = useState(1);
    const totalSteps = 6;

    // Use passed data directly
    const data = lessonData;

    // Lifted State
    const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
    const [level2Text, setLevel2Text] = useState('');
    const [showDefinitions, setShowDefinitions] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState<number>(-1);

    // Quiz State
    // We need to handle multiple quizzes.
    // If legacy 'quiz' exists, treat as single item array.
    const quizzes = data.quizzes || (data.quiz ? [data.quiz] : []);
    const [activeQuizIndex, setActiveQuizIndex] = useState(0);

    // Track state for ALL quizzes
    // Map of quizIndex -> { filledBlanks: string[], options: string[] }
    type QuizState = { filledBlanks: (string | null)[], options: string[] };
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
    }, [data]); // Re-run if data changes

    // Get current active quiz state
    const currentQuiz = quizzes[activeQuizIndex];
    const currentQuizState = quizStates[activeQuizIndex];

    // Check completion
    const isCurrentQuizComplete = currentQuiz && currentQuizState && currentQuiz.correctAnswers.every((ans, i) => currentQuizState.filledBlanks[i] === ans);
    const isAllQuizzesComplete = quizzes.length > 0 && quizStates.length === quizzes.length && quizzes.every((q, qIdx) => {
        const state = quizStates[qIdx];
        return state && q.correctAnswers.every((ans, aIdx) => state.filledBlanks[aIdx] === ans);
    });

    const handleOptionClick = (word: string) => {
        if (!currentQuizState) return;
        const firstEmptyIndex = currentQuizState.filledBlanks.findIndex(b => b === null);
        if (firstEmptyIndex !== -1) {
            const newBlanks = [...currentQuizState.filledBlanks];
            newBlanks[firstEmptyIndex] = word;

            const newStates = [...quizStates];
            newStates[activeQuizIndex] = { ...currentQuizState, filledBlanks: newBlanks };
            setQuizStates(newStates);
        }
    };

    const handleBlankClick = (index: number) => {
        if (!currentQuizState || currentQuizState.filledBlanks[index] !== null) {
            const newBlanks = [...currentQuizState.filledBlanks];
            newBlanks[index] = null;

            const newStates = [...quizStates];
            newStates[activeQuizIndex] = { ...currentQuizState, filledBlanks: newBlanks };
            setQuizStates(newStates);
        }
    };

    const nextStep = () => {
        setHighlightIndex(-1);
        setActiveStep(prev => Math.min(prev + 1, totalSteps));
    };
    const prevStep = () => {
        setHighlightIndex(-1);
        setActiveStep(prev => Math.max(prev - 1, 1));
    };

    // Auto-scroll to top when activeStep changes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [activeStep]);

    // Helper to render text with valid word highlighting
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

    const renderChunkWithVocab = (text: string) => {
        const sortedVocab = [...data.vocabulary]
            .filter(v => v.word && v.word.trim().length > 0)
            .sort((a, b) => b.word.length - a.word.length);

        const pattern = new RegExp(`\\b(${sortedVocab.map(v => v.word.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')).join('|')})\\b`, 'gi');

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

    return (
        <div className="min-h-screen bg-background-level0 py-page-padding-block px-page-padding-inline font-regular text-foreground-primary">
            <div className="max-w-2xl mx-auto space-y-8">

                {/* Header & Progress */}
                <header className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href={`/courses/${slug}`} className="p-2 -ml-2 text-foreground-tertiary hover:text-foreground-primary transition-colors">
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

                    {/* Step 1: Context */}
                    {activeStep === 1 && (
                        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-2">
                                <Badge color="gray" variant="outline">1단계</Badge>
                                <h2 className="text-title3 font-bold">배경 이해하기</h2>
                            </div>
                            <Card level="1" padding="large" className="space-y-6">
                                {/* Context */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Badge color="orange" variant="soft">핵심 개념</Badge>
                                    </div>
                                    <p className="text-regular text-foreground-primary leading-relaxed">
                                        {data.context_desc}
                                    </p>
                                </div>
                                <div className="h-px bg-border-secondary" />
                                {/* Korean */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Badge color="green" variant="soft">한글 번역</Badge>
                                    </div>
                                    <p className="text-title3 font-medium text-foreground-primary leading-relaxed">
                                        {data.translation_kr}
                                    </p>
                                </div>
                                <div className="h-px bg-border-secondary" />
                                {/* English */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Badge color="blue" variant="soft">영어 원문</Badge>
                                    </div>
                                    <p className="text-large font-serif font-medium text-foreground-secondary leading-relaxed">
                                        "{data.original_text}"
                                    </p>
                                </div>
                                {/* Source */}
                                <div className="flex justify-end pt-2">
                                    <span className="text-mini text-foreground-tertiary font-mono">
                                        출처: 비트코인 백서 (Bitcoin Whitepaper)
                                    </span>
                                </div>
                            </Card>
                        </section>
                    )}

                    {/* Step 2: Reading */}
                    {activeStep === 2 && (
                        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Badge color="gray" variant="outline">2단계</Badge>
                                    <h2 className="text-title3 font-bold">원문 읽기</h2>
                                </div>
                                <button
                                    onClick={() => setShowDefinitions(!showDefinitions)}
                                    className={`text-small font-medium px-3 py-1.5 rounded-full transition-colors ${!showDefinitions ? 'bg-accent-default text-white shadow-low hover:bg-accent-hover' : 'bg-background-tertiary text-foreground-secondary hover:bg-background-quaternary'}`}
                                >
                                    단어 뜻 {showDefinitions ? '숨기기' : '보기'}
                                </button>
                            </div>
                            <Card level="2" padding="large" className="border-accent-default/20 space-y-8">
                                {data.chunks.map((chunk, idx) => (
                                    <React.Fragment key={idx}>
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge color="blue" variant="soft">끊어읽기 {idx + 1}</Badge>
                                            </div>
                                            <p className="text-title3 font-serif text-foreground-primary leading-[3]">
                                                {renderChunkWithVocab(chunk.en)}
                                            </p>
                                            <p className="text-regular text-foreground-secondary font-medium pl-1 border-l-2 border-accent-default/20">
                                                {chunk.kr}
                                            </p>
                                        </div>
                                        {idx < data.chunks.length - 1 && <div className="h-px bg-border-primary border-t border-dashed" />}
                                    </React.Fragment>
                                ))}
                            </Card>
                        </section>
                    )}

                    {/* Step 3: Listening */}
                    {activeStep === 3 && (
                        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-2">
                                <Badge color="gray" variant="outline">3단계</Badge>
                                <h2 className="text-title3 font-bold">원문 듣기</h2>
                            </div>
                            <AudioPlayer
                                text={data.original_text}
                                onBoundary={(index) => setHighlightIndex(index)}
                                onEnd={() => setHighlightIndex(-1)}
                            />
                            <Card level="2" padding="large" className="bg-background-secondary/50 min-h-[120px] flex items-center justify-center">
                                {renderKaraokeText(data.original_text, highlightIndex)}
                            </Card>
                        </section>
                    )}

                    {/* Step 4: Recording */}
                    {activeStep === 4 && (
                        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-2">
                                <Badge color="gray" variant="outline">4단계</Badge>
                                <h2 className="text-title3 font-bold">말하기</h2>
                            </div>
                            <Card level="1" className="flex flex-col items-center justify-center p-0 overflow-hidden">
                                <VoiceRecorder
                                    audioURL={recordingUrl}
                                    onRecordingComplete={setRecordingUrl}
                                />
                            </Card>
                            <Card level="2" padding="large" className="mb-6">
                                <p className="text-title2 font-serif font-medium text-foreground-primary leading-relaxed">
                                    "{data.original_text}"
                                </p>
                            </Card>
                            <div className="flex justify-center mt-4">
                                <Button
                                    variant="secondary"
                                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                >
                                    위로 올라가서 녹음 끝내기 ⬆
                                </Button>
                            </div>
                        </section>
                    )}

                    {/* Step 5: Quiz */}
                    {activeStep === 5 && (
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
                    )}

                    {/* Step 6: Copy Typing */}
                    {activeStep === 6 && (
                        <section className="space-y-6 pb-[300px]">
                            <div className="flex items-center gap-2">
                                <Badge color="gray" variant="outline">6단계</Badge>
                                <h2 className="text-title3 font-bold">쓰기 (따라 쓰기)</h2>
                            </div>

                            <div className="space-y-4">
                                <Card level="1" padding="medium" className="bg-background-secondary/50 min-h-[100px] flex items-center">
                                    <TypingFeedback
                                        original={data.original_text}
                                        input={level2Text}
                                    />
                                </Card>
                                {/* Sticky Input Area */}
                                <div className="sticky bottom-0 z-10 pt-4 pb-4 bg-gradient-to-t from-background-level0 via-background-level0 to-transparent">
                                    <div className="bg-background-level0/80 backdrop-blur-sm pt-2 pb-1 rounded-16 shadow-medium ring-1 ring-border-secondary">
                                        <TextArea
                                            autoFocus
                                            placeholder="위 문장을 보면서 똑같이 따라 적어보세요..."
                                            className="font-serif text-large bg-transparent border-none shadow-none focus:ring-0"
                                            value={level2Text}
                                            onChange={(e) => setLevel2Text(e.target.value)}
                                        />
                                    </div>
                                    <div className="absolute top-0 right-0 p-2 opacity-50 text-mini pointer-events-none">
                                        Input is Sticky
                                    </div>
                                </div>
                            </div>
                        </section>
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
                        <Link href={`/courses/${slug}`}>
                            <Button variant="primary">
                                다음 문장으로 넘어가기
                            </Button>
                        </Link>
                    )}
                </footer>

            </div>
        </div>
    );
}
