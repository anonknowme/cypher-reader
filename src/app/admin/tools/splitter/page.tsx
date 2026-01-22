'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextArea } from '@/components/TextArea';
import { Badge } from '@/components/Badge';

interface Chunk {
    id: string;
    text: string;
    isSelected: boolean;
    isEditing: boolean;
}

export default function SplitterPage() {
    // State
    const [sourceText, setSourceText] = useState('');
    const [chunks, setChunks] = useState<Chunk[]>([]);

    // Auto-split Logic (Initial)
    const handleInitialSplit = () => {
        if (!sourceText.trim()) return;

        // Default: Split by paragraphs, preserving non-empty
        // We keep paragraphs as separate chunks initially
        const rawSegments = sourceText.split(/\n\s*\n/).filter(s => s.trim().length > 0);

        const newChunks = rawSegments.map(text => ({
            id: crypto.randomUUID(),
            text: text.trim(), // Initial trim is fine for paragraphs
            isSelected: false,
            isEditing: false
        }));

        setChunks(newChunks);
    };

    // --- Helpers ---
    const getWordCount = (text: string) => {
        if (!text.trim()) return 0;
        return text.trim().split(/\s+/).length;
    };

    const getCountColor = (count: number) => {
        if (count == 0) return 'gray';
        if (count < 40) return 'green';
        if (count < 60) return 'yellow';
        return 'red';
    };

    // --- Actions ---

    // 1. UPDATE Text (Manual Edit)
    const handleUpdateText = (id: string, newText: string) => {
        setChunks(prev => prev.map(c => c.id === id ? { ...c, text: newText } : c));
    };

    // 2. TOGGLE SELECT
    const handleToggleSelect = (id: string) => {
        setChunks(prev => prev.map(c => c.id === id ? { ...c, isSelected: !c.isSelected } : c));
    };

    // 3. TOGGLE EDIT
    const handleToggleEdit = (id: string) => {
        setChunks(prev => prev.map(c => c.id === id ? { ...c, isEditing: !c.isEditing } : c));
    };

    // 4. SPLIT (At word index)
    const handleSplitAtWord = (chunkId: string, wordIndex: number) => {
        setChunks(prev => {
            const index = prev.findIndex(c => c.id === chunkId);
            if (index === -1) return prev;

            const chunk = prev[index];

            // Refined Logic: Use the same tokenizer as the visual renderer
            // split by (\s+) to capture delimiters
            const parts = chunk.text.split(/(\s+)/);

            // Find the split point (the calculated Word Index corresponds to which part?)
            // We iterate parts to find the Nth word
            let currentWordCount = 0;
            let splitPartIndex = -1;

            for (let i = 0; i < parts.length; i++) {
                // If it's NOT a separator (whitespace) and not empty
                if (!/^\s+$/.test(parts[i]) && parts[i].length > 0) {
                    if (currentWordCount === wordIndex) {
                        splitPartIndex = i;
                        break;
                    }
                    currentWordCount++;
                }
            }

            if (splitPartIndex === -1) return prev; // Should not happen

            // First Chunk: Everything up to and including the word
            // We do NOT include the separator immediately following it, as that becomes the "Break"
            const firstText = parts.slice(0, splitPartIndex + 1).join('');

            // Second Chunk: Everything AFTER the separator that follows the word
            // The separator is at splitPartIndex + 1
            const secondText = parts.slice(splitPartIndex + 2).join('');

            const newFirstChunk = { ...chunk, text: firstText, isSelected: false };
            const newSecondChunk = {
                id: crypto.randomUUID(),
                text: secondText,
                isSelected: false,
                isEditing: false
            };

            const newChunks = [...prev];
            newChunks.splice(index, 1, newFirstChunk, newSecondChunk);
            return newChunks;
        });
    };

    // 5. MERGE SELECTED
    const handleMergeSelected = () => {
        // Find all selected indices
        const selectedIndices = chunks
            .map((c, i) => c.isSelected ? i : -1)
            .filter(i => i !== -1)
            .sort((a, b) => a - b);

        if (selectedIndices.length < 2) return;

        // Join texts with space. 
        // Improvement: visual feedback usually implies simple join.
        const mergedText = selectedIndices.map(i => chunks[i].text).join(' '); // Simple space join? Or newline? Space is safer for flow.
        const firstIndex = selectedIndices[0];

        const newChunk = {
            id: crypto.randomUUID(),
            text: mergedText,
            isSelected: true,
            isEditing: false
        };

        setChunks(prev => {
            const newChunks = [...prev];
            const idsToRemove = new Set(selectedIndices.map(i => prev[i].id));

            const constructed: Chunk[] = [];

            prev.forEach((c, i) => {
                if (i === firstIndex) {
                    constructed.push(newChunk);
                } else if (selectedIndices.includes(i)) {
                    // Skip (merged)
                } else {
                    constructed.push(c);
                }
            });

            return constructed;
        });
    };

    // 6. DELETE
    const handleDelete = (id: string) => {
        setChunks(prev => prev.filter(c => c.id !== id));
    };


    // JSON Export
    const jsonOutput = JSON.stringify(
        chunks.map(c => ({ original_text: c.text })),
        null,
        2
    );

    const handleCopyJson = () => {
        navigator.clipboard.writeText(jsonOutput);
    };


    // --- Render Component for Visual Chunk ---
    const VisualChunk = ({ chunk, index }: { chunk: Chunk, index: number }) => {
        return (
            <div
                className={`relative group rounded-md border-l-4 p-4 transition-all duration-200 
                    ${chunk.isSelected ? 'bg-accent-default/10 border-accent-default shadow-sm' : 'bg-background-level1 border-transparent hover:border-border-primary'}
                `}
                onDoubleClick={() => handleToggleEdit(chunk.id)}
            >
                {/* Header / Meta */}
                <div className="flex justify-between items-center mb-2 select-none">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={chunk.isSelected}
                            onChange={() => handleToggleSelect(chunk.id)}
                            className="w-4 h-4 rounded border-gray-300 text-accent-default focus:ring-accent-default"
                        />
                        <Badge variant="soft" color="gray">#{index + 1}</Badge>
                        <Badge variant="soft" color={getCountColor(getWordCount(chunk.text))}>
                            {getWordCount(chunk.text)} words
                        </Badge>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="small" onClick={() => handleToggleEdit(chunk.id)}>Edit</Button>
                        <Button variant="ghost" size="small" className="text-destructive hover:text-destructive" onClick={() => handleDelete(chunk.id)}>Delete</Button>
                    </div>
                </div>

                {/* Content */}
                {chunk.isEditing ? (
                    <div className="mt-2">
                        <TextArea
                            className="w-full min-h-[80px] font-serif text-large"
                            value={chunk.text}
                            onChange={(e) => handleUpdateText(chunk.id, e.target.value)}
                            onBlur={() => handleToggleEdit(chunk.id)}
                            autoFocus
                        />
                        <div className="text-right mt-1">
                            <span className="text-xs text-foreground-tertiary">Click outside to save</span>
                        </div>
                    </div>
                ) : (
                    <div className="mt-2 text-large font-serif leading-relaxed whitespace-pre-wrap">
                        {(() => {
                            // High-Fidelity Rendering loop
                            // Strategy: Split by words, but checking if the separator contained a newline.
                            // Regex to match "Word" and "Separator"
                            // ([^\s]+)(\s+) -- No, just split / (\s+) /

                            const parts = chunk.text.split(/(\s+)/);

                            let wordCountCounter = 0;

                            return parts.map((part, pIdx) => {
                                // If it's a whitespace sequence
                                if (/^\s+$/.test(part)) {
                                    // Check if it has newline
                                    const hasNewline = part.includes('\n');

                                    // Visual separator (the "Cut" button)
                                    // We associate this separator with the word coming BEFORE it.
                                    // So if we click this, we split AFTER word (wordCountCounter - 1).

                                    const splitIndex = wordCountCounter - 1;

                                    return (
                                        <React.Fragment key={pIdx}>
                                            {hasNewline ? <br className="my-2 content-[''] block h-0" /> : ' '}

                                            {/* The Interactive Splitter */}
                                            {splitIndex >= 0 && (
                                                <span
                                                    className="inline-flex items-center justify-center w-4 h-6 mx-0 align-middle cursor-col-resize group/splitter relative opacity-0 hover:opacity-100 transition-opacity"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSplitAtWord(chunk.id, splitIndex);
                                                    }}
                                                    title="Split"
                                                >
                                                    <span className="w-0.5 h-4 bg-accent-default rounded-full shadow-sm transform scale-y-110"></span>
                                                </span>
                                            )}
                                        </React.Fragment>
                                    );
                                } else if (part.length > 0) {
                                    // It's a word
                                    wordCountCounter++;
                                    return (
                                        <span key={pIdx} className="inline-block rounded hover:bg-black/5 transition-colors cursor-text">
                                            {part}
                                        </span>
                                    );
                                }
                                return null;
                            });
                        })()}
                    </div>
                )}
            </div>
        );
    };

    // Calculate selection count
    const selectedCount = chunks.filter(c => c.isSelected).length;

    return (
        <div className="min-h-screen bg-background-level0 flex flex-col h-screen overflow-hidden text-foreground-primary">
            {/* Header */}
            <div className="h-14 border-b border-border-primary flex items-center px-6 justify-between bg-background-level1 shrink-0">
                <div className="flex items-center gap-3">
                    <h1 className="font-bold text-lg">Text Splitter 2.0 (Visual)</h1>
                    <Badge variant="soft" color="blue">{chunks.length} chunks</Badge>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="small" onClick={() => window.location.href = '/admin'}>Exit</Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Input & Controls */}
                <div className="w-1/4 border-r border-border-primary flex flex-col min-w-[300px] bg-background-level1">
                    <div className="p-4 border-b border-border-secondary">
                        <h2 className="font-bold text-foreground-secondary mb-2">1. Paste Source Text</h2>
                        <Button size="small" variant="primary" className="w-full" onClick={handleInitialSplit} disabled={!sourceText}>
                            Start / Reset
                        </Button>
                    </div>
                    <div className="flex-1 p-4 overflow-hidden">
                        <TextArea
                            className="w-full h-full resize-none font-serif text-small bg-background-level0"
                            placeholder="Paste long text here..."
                            value={sourceText}
                            onChange={(e) => setSourceText(e.target.value)}
                        />
                    </div>
                </div>

                {/* Middle: Visual Editor (Main) */}
                <div className="flex-1 flex flex-col bg-background-level0 overflow-hidden min-w-[500px] relative">
                    <div className="p-4 border-b border-border-secondary bg-background-level1 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <h2 className="font-bold text-foreground-secondary">2. Visual Splitter</h2>
                            <div className="text-small text-foreground-tertiary">
                                • Click spaces to split (Preserves newlines)
                                • Check boxes to merge
                                • Double click text to edit
                            </div>
                        </div>
                        {/* Floating Merge Action */}
                        {selectedCount > 1 && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                                <span className="text-small font-medium text-accent-default">{selectedCount} selected</span>
                                <Button size="small" variant="primary" onClick={handleMergeSelected}>
                                    Merge Selected
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-auto p-8 space-y-6">
                        {chunks.map((chunk, index) => (
                            <VisualChunk key={chunk.id} chunk={chunk} index={index} />
                        ))}

                        {chunks.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-foreground-tertiary opacity-50">
                                <div className="text-4xl mb-4">✂️</div>
                                <p>Paste text on the left and click Start</p>
                            </div>
                        )}

                        {/* Spacer for bottom scrolling */}
                        <div className="h-20"></div>
                    </div>
                </div>

                {/* Right: Output JSON */}
                <div className="w-1/5 border-l border-border-primary flex flex-col bg-background-tertiary/5 min-w-[200px]">
                    <div className="p-4 border-b border-border-secondary bg-background-level1 flex justify-between items-center shrink-0">
                        <h2 className="font-bold text-foreground-secondary">3. Export</h2>
                        <Button size="small" variant="primary" onClick={handleCopyJson} disabled={chunks.length === 0}>
                            Copy JSON
                        </Button>
                    </div>
                    <div className="flex-1 p-0 overflow-hidden relative group">
                        <textarea
                            readOnly
                            className="w-full h-full p-4 font-mono text-xs bg-transparent resize-none focus:outline-none"
                            value={jsonOutput}
                        />
                        {/* Overlay hint */}
                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 pointer-events-none flex items-center justify-center transition-opacity">
                            <span className="bg-black/70 text-white px-3 py-1 rounded text-xs">Read Only</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
