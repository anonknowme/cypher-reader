'use client';

import React from 'react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import type { ContextStepProps } from './types';

/**
 * Step 1: Context Understanding
 * 
 * Displays background context, Korean translation, and English original text.
 */
export function ContextStep({ data }: ContextStepProps) {
    return (
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
            </Card>
        </section>
    );
}
