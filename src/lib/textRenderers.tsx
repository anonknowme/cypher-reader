'use client';

import React from 'react';
import { WordWithDefinition } from '@/components/WordWithDefinition';

interface VocabularyItem {
    word: string;
    definition: string;
    level?: string | null;
}

/**
 * Renders text with vocabulary words highlighted and interactive definitions.
 * 
 * @param text - The text to render
 * @param vocabulary - Array of vocabulary items to highlight
 * @param showDefinitions - Whether to always show definitions (vs hover)
 * @returns Array of React nodes (text strings and WordWithDefinition components)
 */
export function renderChunkWithVocab(
    text: string,
    vocabulary: VocabularyItem[],
    showDefinitions: boolean = false
): React.ReactNode[] {
    // Sort by word length (longest first) to avoid partial matches
    const sortedVocab = [...vocabulary]
        .filter(v => v.word && v.word.trim().length > 0)
        .sort((a, b) => b.word.length - a.word.length);

    if (sortedVocab.length === 0) {
        return [text];
    }

    // Build regex pattern for all vocab words
    const pattern = new RegExp(
        `\\b(${sortedVocab.map(v => v.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
        'gi'
    );

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    text.replace(pattern, (match, _p1, offset) => {
        // Add text before match
        if (offset > lastIndex) {
            parts.push(text.slice(lastIndex, offset));
        }

        // Find matching vocab item
        const vocabItem = sortedVocab.find(v => v.word.toLowerCase() === match.toLowerCase()) ||
            sortedVocab.find(v => match.toLowerCase().includes(v.word.toLowerCase()));

        if (vocabItem) {
            parts.push(
                <WordWithDefinition
                    key={`vocab-${offset}`}
                    word={match}
                    def={vocabItem.definition}
                    showAlways={showDefinitions}
                    level={vocabItem.level}
                />
            );
        } else {
            parts.push(match);
        }

        lastIndex = offset + match.length;
        return match;
    });

    // Add remaining text after last match
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
}

/**
 * Renders text with karaoke-style word highlighting for TTS playback.
 * 
 * @param text - The text to render
 * @param currentIndex - Current character index from TTS boundary event
 * @returns React element with highlighted words
 */
export function renderKaraokeText(
    text: string,
    currentIndex: number
): React.ReactNode {
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
                    <span
                        key={i}
                        className={`transition-colors duration-200 ${isHighlighted ? 'text-accent-default scale-105 inline-block' : 'opacity-100'}`}
                    >
                        {word}{' '}
                    </span>
                );
            })}
        </span>
    );
}
