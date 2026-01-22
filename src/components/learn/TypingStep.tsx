'use client';

import React from 'react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { TextArea } from '@/components/TextArea';
import { TypingFeedback } from '@/components/TypingFeedback';
import type { TypingStepProps } from './types';

/**
 * Step 6: Copy Typing
 * 
 * Practice typing each chunk with real-time feedback.
 */
export function TypingStep({
    data,
    chunkInputs,
    setChunkInputs,
    chunkRefs,
    inputRefs,
    onChunkFocus
}: TypingStepProps) {
    // Clean text: remove all non-alphanumeric characters (keep spaces and hyphens) AND collapse whitespace
    const cleanText = (str: string) => str.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, " ");

    // Check if all chunks are complete
    const isStep6Complete = data.chunks.every((chunk, idx) => {
        const targetText = cleanText(chunk.en);
        const userValue = chunkInputs[idx] || '';
        return userValue.toLowerCase().trim() === targetText.toLowerCase().trim();
    });

    return (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
            <div className="flex items-center gap-2">
                <Badge color="gray" variant="outline">6단계</Badge>
                <h2 className="text-title3 font-bold">쓰기 (따라 쓰기)</h2>
            </div>

            <div className="space-y-4">
                {data.chunks.map((chunk, idx) => {
                    const targetText = cleanText(chunk.en);
                    const userValue = chunkInputs[idx] || '';
                    const isMatch = userValue.toLowerCase().trim() === targetText.toLowerCase().trim();

                    return (
                        <div
                            key={idx}
                            ref={el => { chunkRefs.current[idx] = el }}
                            className="scroll-mt-24"
                        >
                            <Card level="1" padding="medium" className={`transition-colors duration-300 ${isMatch ? 'border-semantic-green bg-semantic-green/5' : 'bg-background-secondary/30'}`}>
                                <div className="space-y-3">
                                    <TypingFeedback
                                        original={targetText}
                                        input={userValue}
                                    />
                                    <TextArea
                                        ref={el => { inputRefs.current[idx] = el }}
                                        placeholder={targetText}
                                        className={`
                                            font-serif text-large min-h-[60px] resize-none transition-all
                                            ${isMatch ? 'border-semantic-green ring-1 ring-semantic-green/50' : ''}
                                        `}
                                        value={userValue}
                                        onChange={(e) => {
                                            const newValue = e.target.value;
                                            const newInputs = [...chunkInputs];
                                            newInputs[idx] = newValue;
                                            setChunkInputs(newInputs);

                                            // Auto-focus next input if match
                                            if (newValue.toLowerCase().trim() === targetText.toLowerCase().trim()) {
                                                const nextIdx = idx + 1;
                                                if (nextIdx < data.chunks.length) {
                                                    setTimeout(() => {
                                                        inputRefs.current[nextIdx]?.focus();
                                                    }, 100);
                                                }
                                            }
                                        }}
                                        onFocus={() => onChunkFocus(idx)}
                                    />
                                </div>
                            </Card>
                        </div>
                    );
                })}
            </div>

            {/* Congratulatory Message */}
            {isStep6Complete && (
                <div className="mt-8 p-6 bg-semantic-green/10 border border-semantic-green/30 rounded-16 animate-in zoom-in-95 duration-300 text-center">
                    <div className="text-4xl mb-2">🎉</div>
                    <h3 className="text-title3 font-bold text-semantic-green mb-2">Wonderful!</h3>
                    <p className="text-foreground-secondary">모든 문장을 완벽하게 따라 썼습니다.<br />이제 다음 레슨으로 넘어갈 수 있습니다.</p>
                </div>
            )}
        </section>
    );
}
