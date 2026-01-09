'use client';

import React, { useState, useRef } from 'react';
import { Button } from './Button';

interface VoiceRecorderProps {
    audioURL: string | null;
    onRecordingComplete: (url: string | null) => void;
}

export const VoiceRecorder = ({ audioURL, onRecordingComplete }: VoiceRecorderProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                onRecordingComplete(url);
                chunksRef.current = [];
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("마이크 사용 권한이 필요합니다.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);

            // Stop all tracks to release microphone
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const deleteRecording = () => {
        onRecordingComplete(null);
    };

    return (
        <div className="flex flex-col items-center justify-center p-6 gap-6 w-full">
            {!audioURL ? (
                <>
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-300 ${isRecording
                            ? 'bg-semantic-red border-transparent text-white animate-pulse shadow-high scale-110'
                            : 'bg-background-secondary border-border-secondary text-foreground-tertiary hover:border-accent-default hover:text-accent-default'
                            }`}
                    >
                        {isRecording ? (
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="6" y="4" width="4" height="16"></rect>
                                <rect x="14" y="4" width="4" height="16"></rect>
                            </svg>
                        ) : (
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                <line x1="12" y1="19" x2="12" y2="23"></line>
                                <line x1="8" y1="23" x2="16" y2="23"></line>
                            </svg>
                        )}
                    </button>
                    <p className="text-foreground-secondary text-small font-medium">
                        {isRecording ? '녹음 중... (탭하여 중지)' : '마이크를 탭하여 녹음 시작'}
                    </p>
                </>
            ) : (
                <div className="flex flex-col items-center gap-4 w-full">
                    <div className="w-full bg-background-secondary p-4 rounded-16 flex items-center gap-4">
                        <audio src={audioURL} controls className="w-full h-8" />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="small" onClick={deleteRecording}>다시 녹음하기</Button>
                    </div>
                </div>
            )}
        </div>
    );
};
