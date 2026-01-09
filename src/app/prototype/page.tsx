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
import { generateLessonContent } from '@/actions/lesson-actions';

// Define Types for our Lesson Data
interface LessonData {
    original_text: string;
    translation_kr: string;
    context_desc: string;
    chunks: { en: string; kr: string }[];
    vocabulary: { word: string; definition: string }[];
    quiz: {
        segments: { type: string; content: string; id?: number }[];
        correctAnswers: string[];
        distractors: string[];
    };
}

export default function PrototypePage() {
    const [activeStep, setActiveStep] = useState(1);
    const totalSteps = 6;

    // Data State
    const [data, setData] = useState<LessonData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initial Sentence (Source provided by user/system)
    const sourceSentence = "A purely peer-to-peer version of electronic cash would allow online payments to be sent directly from one party to another without going through a financial institution.";

    // Fetch Data on Mount
    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            const lessonData = await generateLessonContent(sourceSentence);
            if (lessonData) {
                setData(lessonData);
            }
            setIsLoading(false);
        }
        fetchData();
    }, []);

    // Lifted State
    const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
    const [level2Text, setLevel2Text] = useState('');
    const [showDefinitions, setShowDefinitions] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState<number>(-1);

    // Quiz State
    const [filledBlanks, setFilledBlanks] = useState<(string | null)[]>([null, null, null]);
    const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);

    // Initialize quiz options when data loads
    useEffect(() => {
        if (data && data.quiz) {
            const allOptions = [...data.quiz.correctAnswers, ...data.quiz.distractors].sort(() => Math.random() - 0.5);
            setShuffledOptions(allOptions);
            setFilledBlanks(new Array(data.quiz.correctAnswers.length).fill(null));
        }
    }, [data]);

    const handleOptionClick = (word: string) => {
        const firstEmptyIndex = filledBlanks.findIndex(b => b === null);
        if (firstEmptyIndex !== -1) {
            const newBlanks = [...filledBlanks];
            newBlanks[firstEmptyIndex] = word;
            setFilledBlanks(newBlanks);
        }
    };

    const handleBlankClick = (index: number) => {
        if (filledBlanks[index] !== null) {
            const newBlanks = [...filledBlanks];
            newBlanks[index] = null;
            setFilledBlanks(newBlanks);
        }
    };

    if (isLoading || !data) {
        return (
            <div className="min-h-screen bg-background-level0 flex flex-col items-center justify-center p-6 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-default"></div>
                <p className="text-foreground-secondary animate-pulse">Gemini AI가 학습 콘텐츠를 생성하고 있습니다...</p>
            </div>
        );
    }

    const { quiz } = data;
    const isQuizComplete = filledBlanks.every((b, i) => b === quiz.correctAnswers[i]);

    const nextStep = () => {
        setHighlightIndex(-1);
        setActiveStep(prev => Math.min(prev + 1, totalSteps));
    };
    const prevStep = () => {
        setHighlightIndex(-1);
        setActiveStep(prev => Math.max(prev - 1, 1));
    };

    const Word = ({ word, def }: { word: string; def: string }) => (
        <span className="inline-flex flex-col items-center align-text-top leading-none mx-0.5 relative group cursor-pointer">
            <span className={`border-b border-dashed border-foreground-secondary/30 transition-colors ${showDefinitions ? 'text-accent-default' : ''}`}>{word}</span>
            <span className={`text-mini text-accent-default font-sans font-medium mt-0.5 whitespace-nowrap transition-all duration-300 ${showDefinitions ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 absolute top-full pointer-events-none'}`}>
                {def}
            </span>
        </span>
    );

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

    // Helper to find definition for a word in chunks
    const getDefinition = (word: string) => {
        const found = data.vocabulary.find(v => word.toLowerCase().includes(v.word.toLowerCase()) || v.word.toLowerCase().includes(word.toLowerCase()));
        return found ? found.definition : null;
    };

    return (
        <div className="min-h-screen bg-background-level0 py-page-padding-block px-page-padding-inline font-regular text-foreground-primary">
            <div className="max-w-2xl mx-auto space-y-8">

                {/* Header & Progress */}
                <header className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href="/" className="p-2 -ml-2 text-foreground-tertiary hover:text-foreground-primary transition-colors">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                            </Link>
                            <Badge color="accent" variant="soft">Progress</Badge>
                        </div>
                        <span className="text-small text-foreground-tertiary">Step {activeStep} of {totalSteps}</span>
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
                                <Badge color="gray" variant="outline">Step 1</Badge>
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
                                        Source: Bitcoin Whitepaper
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
                                    <Badge color="gray" variant="outline">Step 2</Badge>
                                    <h2 className="text-title3 font-bold">원문 읽기</h2>
                                </div>
                                <button
                                    onClick={() => setShowDefinitions(!showDefinitions)}
                                    className={`text-small font-medium px-3 py-1.5 rounded-full transition-colors ${!showDefinitions ? 'bg-accent-default text-white shadow-low hover:bg-accent-hover' : 'bg-background-tertiary text-foreground-secondary hover:bg-background-quaternary'}`}
                                >
                                    단어 뜻 {showDefinitions ? '숨기기' : '보기'}
                                </button>
                            </div>
                            <Card level="2" padding="large" className="border-accent-default/20 space-y-6">
                                {data.chunks.map((chunk, idx) => {
                                    // Robust Vocabulary Matching (Tokenization)
                                    const renderChunkWithVocab = (text: string) => {
                                        // 1. Sort vocab by length (descending) to match longest phrases first
                                        const sortedVocab = [...data.vocabulary].sort((a, b) => b.word.length - a.word.length);

                                        // 2. Create a regex pattern that matches any of the vocab words (whole word/phrase only)
                                        // Escape special regex chars in words and use word boundaries (\b)
                                        const pattern = new RegExp(`\\b(${sortedVocab.map(v => v.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');

                                        const parts = [];
                                        let lastIndex = 0;

                                        // 3. Find unique matches
                                        // We use replace to iterate, but push to array
                                        text.replace(pattern, (match, p1, offset) => {
                                            // Push preceding text
                                            if (offset > lastIndex) {
                                                parts.push(text.slice(lastIndex, offset));
                                            }

                                            // Find the exact vocab definition
                                            const vocabItem = sortedVocab.find(v => v.word.toLowerCase() === match.toLowerCase());

                                            if (vocabItem) {
                                                parts.push(<Word key={offset} word={match} def={vocabItem.definition} />);
                                            } else {
                                                parts.push(match);
                                            }

                                            lastIndex = offset + match.length;
                                            return match;
                                        });

                                        // Push remaining text
                                        if (lastIndex < text.length) {
                                            parts.push(text.slice(lastIndex));
                                        }

                                        return parts.length > 0 ? parts : [text];
                                    };

                                    return (
                                        <React.Fragment key={idx}>
                                            <div className="grid md:grid-cols-[1fr,1.5fr] gap-4 items-start">
                                                <p className="text-regular text-foreground-secondary font-medium pt-1">
                                                    {chunk.kr}
                                                </p>
                                                <p className="text-title3 font-serif text-foreground-primary leading-loose">
                                                    {renderChunkWithVocab(chunk.en)}
                                                </p>
                                            </div>
                                            {idx < data.chunks.length - 1 && <div className="h-px bg-border-secondary/50" />}
                                        </React.Fragment>
                                    );
                                })}
                            </Card>
                        </section>
                    )}

                    {/* Step 3: Listening */}
                    {activeStep === 3 && (
                        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-2">
                                <Badge color="gray" variant="outline">Step 3</Badge>
                                <h2 className="text-title3 font-bold">원문 듣기</h2>
                            </div>
                            <Card level="2" padding="large" className="mb-6">
                                {renderKaraokeText(data.original_text, highlightIndex)}
                            </Card>
                            <AudioPlayer
                                text={data.original_text}
                                onBoundary={(index) => setHighlightIndex(index)}
                                onEnd={() => setHighlightIndex(-1)}
                            />
                        </section>
                    )}

                    {/* Step 4: Recording */}
                    {activeStep === 4 && (
                        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-2">
                                <Badge color="gray" variant="outline">Step 4</Badge>
                                <h2 className="text-title3 font-bold">말하기</h2>
                            </div>
                            <Card level="2" padding="large" className="mb-6">
                                <p className="text-title2 font-serif font-medium text-foreground-primary leading-relaxed">
                                    "{data.original_text}"
                                </p>
                            </Card>
                            <Card level="1" className="flex flex-col items-center justify-center p-0 overflow-hidden">
                                <VoiceRecorder
                                    audioURL={recordingUrl}
                                    onRecordingComplete={setRecordingUrl}
                                />
                            </Card>
                        </section>
                    )}

                    {/* Step 5: Quiz (Fill in the Blank) */}
                    {activeStep === 5 && (
                        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-2">
                                <Badge color="gray" variant="outline">Step 5</Badge>
                                <h2 className="text-title3 font-bold">쓰기 (빈칸 퀴즈)</h2>
                            </div>

                            <div className="space-y-6">
                                <Card level="1" padding="medium" className={`bg-background-secondary/50 min-h-[120px] flex items-center justify-center transition-colors duration-300 ${isQuizComplete ? 'border-semantic-green bg-semantic-green/5' : ''}`}>
                                    <p className="text-large font-serif leading-loose text-foreground-primary text-center">
                                        {quiz.segments.map((seg, i) => {
                                            if (seg.type === 'text') return <span key={i}>{seg.content}</span>;
                                            const id = seg.id !== undefined ? seg.id : -1;
                                            const isFilled = filledBlanks[id] !== null;
                                            const isCorrect = filledBlanks[id] === quiz.correctAnswers[id];

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
                                                    {filledBlanks[id] || "_"}
                                                </button>
                                            );
                                        })}
                                    </p>
                                </Card>

                                <div className="bg-background-level2 p-4 rounded-16 border border-border-secondary">
                                    <p className="text-small text-foreground-tertiary mb-3 text-center">단어를 선택하여 빈칸을 채우세요</p>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {shuffledOptions.map((option, idx) => {
                                            const isUsed = filledBlanks.includes(option);
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
                            </div>
                        </section>
                    )}

                    {/* Step 6: Copy Typing */}
                    {activeStep === 6 && (
                        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-2">
                                <Badge color="gray" variant="outline">Step 6</Badge>
                                <h2 className="text-title3 font-bold">쓰기 (따라 쓰기)</h2>
                            </div>

                            <div className="space-y-4">
                                <Card level="1" padding="medium" className="bg-background-secondary/50 min-h-[100px] flex items-center">
                                    <TypingFeedback
                                        original={data.original_text}
                                        input={level2Text}
                                    />
                                </Card>
                                <TextArea
                                    autoFocus
                                    placeholder="위 문장을 보면서 똑같이 따라 적어보세요..."
                                    className="font-serif text-large"
                                    value={level2Text}
                                    onChange={(e) => setLevel2Text(e.target.value)}
                                />
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
                        <Button variant="primary" onClick={nextStep} disabled={activeStep === 5 && !isQuizComplete}>
                            다음 단계
                        </Button>
                    ) : (
                        <Button variant="primary">
                            다음 문장으로 넘어가기
                        </Button>
                    )}
                </footer>

            </div>
        </div>
    );
}
