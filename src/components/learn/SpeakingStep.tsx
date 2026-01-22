'use client';

import React from 'react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import type { SpeakingStepProps } from './types';

/**
 * Step 4: Speaking
 * 
 * Voice recording with reference text display.
 */
export function SpeakingStep({ data, recordingUrl, setRecordingUrl }: SpeakingStepProps) {
    return (
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
    );
}
