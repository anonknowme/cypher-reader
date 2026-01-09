'use client';

import React, { useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Input } from '@/components/Input';
import { Avatar } from '@/components/Avatar';
import { ProgressBar } from '@/components/ProgressBar';
import { AudioPlayer } from '@/components/AudioPlayer';
import { TextArea } from '@/components/TextArea';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { TypingFeedback } from '@/components/TypingFeedback';
import { Tooltip } from '@/components/Tooltip';
import { WordWithDefinition } from '@/components/WordWithDefinition';
import { ContentCard } from '@/components/ContentCard';

const DemoWordDefinition = () => {
    const [showAll, setShowAll] = useState(false);

    // Sample data
    const sentence = [
        { text: "Digital signatures ", vocab: { word: "Digital signatures", def: "디지털 서명 (데이터 위변조 방지)" } },
        { text: "provide part of the solution, but the main " },
        { text: "benefits ", vocab: { word: "benefits", def: "이점, 혜택" } },
        { text: "are lost if a " },
        { text: "trusted third party ", vocab: { word: "trusted third party", def: "신뢰할 수 있는 제3자 (중개인)" } },
        { text: "is still required to prevent " },
        { text: "double-spending", vocab: { word: "double-spending", def: "이중 지불" } },
        { text: "." }
    ];

    return (
        <div className="space-y-4">
            <Button size="small" variant="secondary" onClick={() => setShowAll(!showAll)}>
                {showAll ? '뜻 숨기기' : '모든 뜻 보기'}
            </Button>

            <Card level="2" padding="large">
                <p className="text-title3 font-serif leading-[3] text-foreground-primary">
                    {sentence.map((part, i) => (
                        <React.Fragment key={i}>
                            {part.vocab ? (
                                <WordWithDefinition
                                    word={part.vocab.word}
                                    def={part.vocab.def}
                                    showAlways={showAll}
                                />
                            ) : (
                                <span>{part.text}</span>
                            )}
                        </React.Fragment>
                    ))}
                </p>
            </Card>
        </div>
    );
};

export default function ComponentsPage() {
    // State for interactive demos
    const [recorderUrl, setRecorderUrl] = useState<string | null>(null);
    const [typingInput, setTypingInput] = useState('Typing Fe');
    const [progress, setProgress] = useState(2);

    return (
        <div className="min-h-screen bg-background-level0 py-page-padding-block px-page-padding-inline font-regular text-foreground-primary">
            <div className="max-w-4xl mx-auto space-y-16">

                <section className="space-y-4">
                    <h1 className="text-title1 font-bold leading-tight">디자인 시스템</h1>
                    <p className="text-large text-foreground-secondary leading-relaxed">
                        비트코인 테마와 컴포넌트 구성을 확인하기 위한 데모 페이지입니다.
                    </p>
                </section>

                {/* Badges Section */}
                <section className="space-y-6">
                    <div className="border-b border-border-primary pb-2 mb-6">
                        <h2 className="text-title2 font-medium">뱃지 (Badges)</h2>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <Badge color="accent">승인됨</Badge>
                        <Badge color="blue">정보</Badge>
                        <Badge color="green">성공</Badge>
                        <Badge color="red">오류</Badge>
                        <Badge color="orange">경고</Badge>
                        <Badge color="yellow">주의</Badge>
                        <Badge color="gray">보관됨</Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-4">
                        <Badge variant="solid" color="accent">Solid</Badge>
                        <Badge variant="outline" color="accent">Outline</Badge>
                        <Badge variant="soft" color="accent">Soft</Badge>
                    </div>
                </section>

                {/* Buttons Section */}
                <section className="space-y-6">
                    <div className="border-b border-border-primary pb-2 mb-6">
                        <h2 className="text-title2 font-medium">버튼 (Buttons)</h2>
                    </div>
                    <div className="flex flex-wrap gap-4 items-center">
                        <Button variant="primary">기본 버튼</Button>
                        <Button variant="secondary">보조 버튼</Button>
                        <Button variant="ghost">고스트 버튼</Button>
                        <Button variant="danger">위험 버튼</Button>
                    </div>
                    <div className="flex flex-wrap gap-4 items-center">
                        <Button size="small">작게</Button>
                        <Button size="medium">중간</Button>
                        <Button size="large">크게</Button>
                    </div>
                </section>

                {/* Inputs Section */}
                <section className="space-y-6">
                    <div className="border-b border-border-primary pb-2 mb-6">
                        <h2 className="text-title2 font-medium">입력 필드 (Inputs)</h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <Input label="이메일" placeholder="name@example.com" />
                        <Input label="비밀번호" type="password" placeholder="••••••••" />
                        <Input label="오류 상태" placeholder="Invalid input" error="유효하지 않은 이메일입니다." />
                        <Input label="비활성화" placeholder="Disabled" disabled />
                    </div>
                    {/* TextArea */}
                    <div className="mt-6">
                        <TextArea label="긴 텍스트 입력 (TextArea)" placeholder="내용을 입력하세요..." helperText="최대 500자까지 입력 가능합니다." />
                    </div>
                </section>

                {/* Interactive Media Section */}
                <section className="space-y-6">
                    <div className="border-b border-border-primary pb-2 mb-6">
                        <h2 className="text-title2 font-medium">미디어 & 인터랙티브 (Interactive)</h2>
                    </div>

                    <div className="space-y-8">
                        {/* Audio Player */}
                        <div className="space-y-2">
                            <h3 className="text-title3 font-medium">오디오 플레이어 (TTS/File)</h3>
                            <AudioPlayer text="Hello! This is a demonstration of the text-to-speech functionality." />
                        </div>

                        {/* Voice Recorder */}
                        <div className="space-y-2">
                            <h3 className="text-title3 font-medium">음성 녹음기</h3>
                            <Card level="1" className="p-0 overflow-hidden">
                                <VoiceRecorder
                                    audioURL={recorderUrl}
                                    onRecordingComplete={setRecorderUrl}
                                />
                            </Card>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                            <h3 className="text-title3 font-medium">프로그레스 바 (Segmented)</h3>
                            <ProgressBar currentStep={progress} totalSteps={5} onStepClick={setProgress} />
                        </div>

                        {/* Tooltip */}
                        <div className="space-y-2">
                            <h3 className="text-title3 font-medium">툴팁 (Tooltip)</h3>
                            <p className="text-large">
                                Hover or tap on <Tooltip content="도움말 텍스트입니다.">this text</Tooltip> to see the tooltip.
                            </p>
                        </div>

                        {/* Typing Feedback */}
                        <div className="space-y-2">
                            <h3 className="text-title3 font-medium">타이핑 피드백</h3>
                            <Card level="1" padding="medium">
                                <TypingFeedback original="Typing Feedback Demo" input={typingInput} />
                            </Card>
                            <Input
                                placeholder="Try typing 'Typing Feedback Demo'..."
                                value={typingInput}
                                onChange={(e) => setTypingInput(e.target.value)}
                            />
                        </div>
                    </div>
                </section>

                {/* Word Definition Component */}
                <section className="space-y-6">
                    <div className="border-b border-border-primary pb-2 mb-6">
                        <h2 className="text-title2 font-medium">단어 학습 (Word Definition)</h2>
                    </div>

                    <div className="space-y-4">
                        <p className="text-foreground-secondary">
                            Click or tap on the words to toggle definitions. Use the button to toggle all.
                        </p>
                        <DemoWordDefinition />
                    </div>
                </section>

                {/* Avatars Section */}
                <section className="space-y-6">
                    <div className="border-b border-border-primary pb-2 mb-6">
                        <h2 className="text-title2 font-medium">아바타 (Avatars)</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <Avatar size="xlarge" initials="XL" />
                        <Avatar size="large" initials="LG" />
                        <Avatar size="medium" initials="MD" />
                        <Avatar size="small" initials="SM" />
                    </div>
                </section>

                {/* Cards Section */}
                <section className="space-y-6">
                    <div className="border-b border-border-primary pb-2 mb-6">
                        <h2 className="text-title2 font-medium">카드 (Cards)</h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card level="1">
                            <h3 className="text-title3 font-medium mb-2">카드 레벨 1</h3>
                            <p className="text-foreground-secondary leading-relaxed">콘텐츠를 그룹화하는 데 사용되는 표준 카드 컴포넌트입니다.</p>
                            <div className="mt-4">
                                <Button size="small" variant="secondary">동작</Button>
                            </div>
                        </Card>
                        <Card level="2">
                            <h3 className="text-title3 font-medium mb-2">카드 레벨 2</h3>
                            <p className="text-foreground-secondary leading-relaxed">중요하거나 떠있는 콘텐츠를 위해 조금 더 밝은 배경을 가집니다.</p>
                        </Card>
                    </div>
                </section>

                {/* Content Cards Demo */}
                <section className="space-y-6">
                    <div className="border-b border-border-primary pb-2 mb-6">
                        <h2 className="text-title2 font-medium">콘텐츠 카드 (Content Cards)</h2>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <ContentCard
                            title="Bitcoin Whitepaper"
                            description="The original whitepaper by Satoshi Nakamoto."
                            category="Bitcoin"
                            level="2 Lessons"
                            thumbnailColor="bg-gradient-to-br from-orange-400 to-red-500"
                        />
                        <ContentCard
                            title="The Bullish Case"
                            description="An introduction to Bitcoin investment thesis."
                            category="Course"
                            level="11 Lessons"
                            thumbnailColor="bg-gray-500"
                            imgUrl="https://m.media-amazon.com/images/I/81fJ-zfN7IL._UF894,1000_QL80_.jpg"
                        />
                        <ContentCard
                            title="Locked Content"
                            description="This content is coming soon."
                            category="Course"
                            level="Coming Soon"
                            thumbnailColor="bg-slate-500"
                            disabled
                        />
                    </div>
                </section>

            </div>
        </div>
    );
}
