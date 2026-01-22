'use client';

import React from 'react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { renderChunkWithVocab } from '@/lib/textRenderers';
import type { ReadingStepProps } from './types';

/**
 * Step 2: Reading with Vocabulary
 * 
 * Displays chunks with vocabulary highlighting and translations.
 */
export function ReadingStep({ data, showDefinitions, setShowDefinitions }: ReadingStepProps) {
    return (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Badge color="gray" variant="outline">2단계</Badge>
                    <h2 className="text-title3 font-bold">원문 읽기</h2>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-3 text-small text-foreground-tertiary">
                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span>초급</div>
                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span>중급</div>
                        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent-default"></span>Bitcoin</div>
                    </div>
                    <button
                        onClick={() => setShowDefinitions(!showDefinitions)}
                        className={`text-small font-medium px-3 py-1.5 rounded-full transition-colors ${!showDefinitions ? 'bg-accent-default text-white shadow-low hover:bg-accent-hover' : 'bg-background-tertiary text-foreground-secondary hover:bg-background-quaternary'}`}
                    >
                        단어 뜻 {showDefinitions ? '숨기기' : '보기'}
                    </button>
                </div>
            </div>
            <Card level="2" padding="large" className="border-accent-default/20 space-y-8">
                {data.chunks.map((chunk, idx) => (
                    <React.Fragment key={idx}>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Badge color="blue" variant="soft">끊어읽기 {idx + 1}</Badge>
                            </div>
                            <p className="text-title3 font-serif text-foreground-primary leading-[3]">
                                {renderChunkWithVocab(chunk.en, data.vocabulary, showDefinitions)}
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
    );
}
