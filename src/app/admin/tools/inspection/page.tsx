'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextArea } from '@/components/TextArea';
import { Badge } from '@/components/Badge';

export default function InspectionPage() {
    const [sourceText, setSourceText] = useState('');
    const [jsonInput, setJsonInput] = useState('');
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [verifiedSegments, setVerifiedSegments] = useState<Array<{ id: string, text: string, originalJson: any }>>([]);

    // Logic to auto-resize textarea height to fit content
    // This allows the main scrollbar to be on the container, not the textarea
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        if (textareaRef.current) {
            // Reset height to auto first to shrink if needed
            textareaRef.current.style.height = 'auto';
            // Set to scrollHeight to expand
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [sourceText]);

    // Calculate the full text from verified segments
    const verifiedFullText = useMemo(() => {
        return verifiedSegments.map(s => s.text).join('');
    }, [verifiedSegments]);

    // Comparison Logic
    const comparisonResult = useMemo(() => {
        if (!sourceText) return { status: 'empty', matchIndex: 0 };

        let i = 0; // Source pointer
        let j = 0; // Verified pointer

        const sourceLen = sourceText.length;
        const verifiedLen = verifiedFullText.length;

        while (i < sourceLen && j < verifiedLen) {
            const charS = sourceText[i];
            const charV = verifiedFullText[j];

            // 1. Exact Match
            if (charS === charV) {
                i++;
                j++;
                continue;
            }

            // 2. Whitespace Skip (Aggressive)
            // If Source has whitespace, skip it (allow Source to have extra formatting)
            if (/\s/.test(charS)) {
                i++;
                continue;
            }

            // If Verified has whitespace, skip it (allow JSON to have extra formatting)
            if (/\s/.test(charV)) {
                j++;
                continue;
            }

            // 3. Real Mismatch
            // If specific non-whitespace chars mismatch, it's an error.
            return { status: 'mismatch', matchIndex: i, mismatchChar: charS };
        }

        // If we finished verifying everything we have so far
        if (j === verifiedLen) {
            return { status: 'match', matchIndex: i };
        }

        // If we ran out of Source but still have Verified text
        return { status: 'mismatch', matchIndex: i, mismatchChar: 'EOF' };
    }, [sourceText, verifiedFullText]);

    const handleAddJson = () => {
        setJsonError(null);
        if (!jsonInput.trim()) return;

        try {
            const parsed = JSON.parse(jsonInput);
            const items = Array.isArray(parsed) ? parsed : [parsed];

            const newSegments: any[] = [];

            items.forEach((item: any, idx: number) => {
                const text = item.original_text;
                if (typeof text !== 'string') {
                    throw new Error(`Item ${idx} missing 'original_text'`);
                }
                newSegments.push({
                    id: Date.now() + '-' + idx, // Simple ID
                    text: text,
                    originalJson: item
                });
            });

            setVerifiedSegments(prev => [...prev, ...newSegments]);
            setJsonInput(''); // Clear input on success
        } catch (e: any) {
            setJsonError(e.message || 'Invalid JSON');
        }
    };

    const handleReset = () => {
        if (confirm('Reset all verified segments?')) {
            setVerifiedSegments([]);
        }
    };

    const handleResetSource = () => {
        if (confirm('Clear source text?')) {
            setSourceText('');
        }
    };

    return (
        <div className="min-h-screen bg-background-level0 flex flex-col h-screen overflow-hidden">
            {/* Header */}
            <div className="h-14 border-b border-border-primary flex items-center px-6 justify-between bg-background-level1 shrink-0">
                <div className="flex items-center gap-3">
                    <h1 className="font-bold text-lg text-foreground-primary">Content Inspection Tool</h1>
                    <Badge variant="soft" color={comparisonResult.status === 'match' ? 'green' : (comparisonResult.status === 'mismatch' ? 'red' : 'gray')}>
                        {comparisonResult.status === 'match' ? 'Matching' : comparisonResult.status === 'mismatch' ? 'Mismatch Found' : 'Waiting'}
                    </Badge>
                </div>
                <div className="text-small text-foreground-tertiary">
                    {verifiedFullText.length} verified chars / Match Index: {comparisonResult.matchIndex}
                </div>
            </div>

            {/* Main Content - Split View */}
            <div className="flex-1 flex overflow-hidden">

                {/* Left: Source Text */}
                <div className="flex-1 border-r border-border-primary flex flex-col min-w-0">
                    <div className="p-4 border-b border-border-secondary bg-background-level1 flex justify-between items-center shrink-0">
                        <h2 className="font-bold text-foreground-secondary">1. Source Text (Full)</h2>
                        <Button variant="ghost" size="small" onClick={handleResetSource} disabled={!sourceText}>Clear</Button>
                    </div>

                    {/* SCROLL CONTAINER (One scrollbar for both) */}
                    <div className="relative flex-1 bg-background-level0 overflow-auto">
                        <div className="relative w-full min-h-full">
                            {/* Highlighting Overlay (Absolute, Background) */}
                            <div
                                className="absolute top-0 left-0 w-full h-full p-6 whitespace-pre-wrap font-serif text-lg leading-relaxed z-0 pointer-events-none text-transparent break-words"
                                aria-hidden="true"
                            >
                                {/* Render matching part */}
                                <span className="bg-semantic-green/20 border-b-2 border-semantic-green text-transparent decoration-clone">
                                    {sourceText.slice(0, comparisonResult.matchIndex)}
                                </span>
                                {/* Render mismatching part (if any) */}
                                {comparisonResult.status === 'mismatch' && (
                                    <span className="bg-semantic-red/30 border-b-2 border-semantic-red animate-pulse inline-block min-w-[5px] align-text-bottom text-transparent">
                                        {/* Show a chunk of context for the error location */}
                                        {sourceText.slice(comparisonResult.matchIndex, comparisonResult.matchIndex + 1) || ' '}
                                    </span>
                                )}
                            </div>

                            {/* Actual Textarea (Relative, Transparent Background, On Top) */}
                            <textarea
                                ref={textareaRef}
                                className="relative z-10 block w-full h-full p-6 whitespace-pre-wrap font-serif text-lg leading-relaxed bg-transparent text-foreground-primary resize-none outline-none overflow-hidden"
                                placeholder="Paste the full source text here..."
                                value={sourceText}
                                onChange={e => setSourceText(e.target.value)}
                                spellCheck={false}
                                style={{ minHeight: '100%' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Right: JSON Input & Verified List */}
                <div className="flex-1 flex flex-col min-w-0 bg-background-tertiary/10">

                    {/* Top: JSON Input */}
                    <div className="flex-1 flex flex-col min-h-0 border-b border-border-primary">
                        <div className="p-4 border-b border-border-secondary bg-background-level1">
                            <h2 className="font-bold text-foreground-secondary">2. Input JSON Chunk</h2>
                        </div>
                        <div className="flex-1 p-4 flex flex-col gap-4">
                            <TextArea
                                className="flex-1 font-mono text-xs"
                                placeholder='Paste JSON Array here... [{"original_text": "..."}]'
                                value={jsonInput}
                                onChange={e => setJsonInput(e.target.value)}
                            />
                            {jsonError && (
                                <p className="text-destructive text-small">{jsonError}</p>
                            )}
                            <div className="flex justify-end">
                                <Button onClick={handleAddJson} disabled={!jsonInput.trim()}>
                                    Add & Verify ↓
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Bottom: Verified Segments List */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background-level2">
                        <div className="p-4 border-b border-border-secondary bg-background-level1 flex justify-between items-center">
                            <h2 className="font-bold text-foreground-secondary">Verified Segments ({verifiedSegments.length})</h2>
                            <Button variant="ghost" size="small" onClick={handleReset} disabled={verifiedSegments.length === 0} className="text-destructive">Reset All</Button>
                        </div>

                        <div className="flex-1 overflow-auto p-4 space-y-3">
                            {/* Sequential order */}
                            {verifiedSegments.map((seg, idx) => (
                                <Card key={seg.id} level="1" padding="medium" className="border-l-4 border-semantic-green">
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant="soft" color="gray">#{idx + 1}</Badge>
                                        <Button variant="ghost" size="small" className="h-6 text-foreground-tertiary" onClick={() => {
                                            setVerifiedSegments(prev => prev.filter((_, i) => i !== idx));
                                        }}>✕</Button>
                                    </div>
                                    <p className="text-small text-foreground-secondary line-clamp-3 font-serif">
                                        {seg.text}
                                    </p>
                                    <div className="mt-2 text-mini text-foreground-tertiary flex gap-2">
                                        <span className="bg-black/20 px-1 rounded">{seg.originalJson.chunks?.length || 0} chunks</span>
                                        <span className="bg-black/20 px-1 rounded">{seg.originalJson.vocabulary?.length || 0} vocab</span>
                                        <span className="bg-black/20 px-1 rounded">{seg.originalJson.quizzes?.length || 0} quizzes</span>
                                    </div>
                                </Card>
                            ))}

                            {verifiedSegments.length === 0 && (
                                <p className="text-center text-foreground-tertiary text-small py-8">
                                    No segments added yet.
                                </p>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
