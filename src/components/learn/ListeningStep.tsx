'use client';

import React from 'react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { AudioPlayer } from '@/components/AudioPlayer';
import { renderKaraokeText } from '@/lib/textRenderers';
import type { ListeningStepProps } from './types';

/**
 * Step 3: Listening
 * 
 * Audio playback with karaoke-style word highlighting.
 */
export function ListeningStep({ data, highlightIndex, setHighlightIndex }: ListeningStepProps) {
    return (
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
    );
}
