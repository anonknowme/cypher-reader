'use client';

import React, { useState, useEffect, useRef } from 'react';

interface AudioPlayerProps {
    src?: string;
    text?: string; // Text to speak (TTS)
    onBoundary?: (charIndex: number) => void;
    onEnd?: () => void;
    className?: string;
}

export const AudioPlayer = ({ src, text, onBoundary, onEnd, className = '' }: AudioPlayerProps) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Create mock visualization bars
    const [bars] = useState(() => Array.from({ length: 40 }, () => Math.floor(Math.random() * 80) + 20));

    useEffect(() => {
        if (src) {
            audioRef.current = new Audio(src);
            audioRef.current.onended = () => setIsPlaying(false);
        }
    }, [src]);

    const togglePlay = () => {
        if (src && audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        } else if (text) {
            // TTS Logic
            if (isPlaying) {
                window.speechSynthesis.cancel();
                setIsPlaying(false);
                if (onEnd) onEnd();
            } else {
                // Cancel any previous utterance to ensure clean start
                window.speechSynthesis.cancel();

                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'en-US';
                utterance.rate = 0.9;

                utterance.onboundary = (event) => {
                    if (onBoundary) onBoundary(event.charIndex);
                };

                utterance.onend = () => {
                    setIsPlaying(false);
                    if (onEnd) onEnd();
                };

                window.speechSynthesis.speak(utterance);
                setIsPlaying(true);
            }
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (src && audioRef.current) {
                audioRef.current.pause();
            }
            if (text) {
                window.speechSynthesis.cancel();
            }
        };
    }, [src, text]);

    return (
        <div className={`bg-background-secondary rounded-16 p-4 flex items-center gap-4 ${className}`}>
            <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-circle bg-accent-default flex items-center justify-center text-white hover:bg-accent-hover transition-colors shadow-low flex-shrink-0"
            >
                {isPlaying ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                )}
            </button>

            <div className="flex-1 h-12 flex items-center gap-0.5 overflow-hidden opacity-80">
                {bars.map((height, i) => (
                    <div
                        key={i}
                        className={`w-1.5 rounded-full transition-all duration-300 ${isPlaying ? 'bg-accent-default animate-pulse' : 'bg-foreground-quaternary'}`}
                        style={{ height: `${isPlaying ? height : height * 0.3}%` }}
                    />
                ))}
            </div>

            {!text && (
                <div className="text-small text-foreground-tertiary font-mono">
                    00:{isPlaying ? '12' : '00'} / 00:45
                </div>
            )}
        </div>
    );
};
