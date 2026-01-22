'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { TextArea } from '@/components/TextArea';
import { updateLesson, LessonWithChildren } from '@/actions/course-actions';
import { Message } from './types';

export interface EditorViewProps {
    activeLesson: LessonWithChildren | null;
    setActiveLesson: (lesson: LessonWithChildren | null) => void;
    editMode: 'structure' | 'vocab';
    setEditMode: (mode: 'structure' | 'vocab') => void;
    message: Message | null;
    setMessage: (msg: Message | null) => void;
    setIsLoading: (loading: boolean) => void;
    setUnsavedChanges: (isDirty: boolean) => void;
    onClose: () => void;
}

export const EditorView = ({
    activeLesson,
    setActiveLesson,
    editMode,
    setEditMode,
    message,
    setMessage,
    setIsLoading,
    setUnsavedChanges,
    onClose
}: EditorViewProps) => {
    const [jsonInput, setJsonInput] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    if (!activeLesson) return null;

    // Flattened: activeLesson IS the content
    const content = activeLesson;
    // Check if it has content (naive check: chunks exist or original_text non-empty)
    const hasContent = (content.chunks && content.chunks.length > 0) || !!content.original_text;

    // Editor Selection State (Global for the lesson)
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

    // Vocabulary Selection State
    const [isDirty, setIsDirty] = useState(false);

    // Sync dirty state with parent
    useEffect(() => {
        setUnsavedChanges(isDirty);
    }, [isDirty, setUnsavedChanges]);
    const [generatedPrompt, setGeneratedPrompt] = useState('');

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const saved = await updateLesson(activeLesson.id, [content]);
            if (saved) {
                // Cast saved result if needed, usually returns current lesson data
                setActiveLesson(saved as LessonWithChildren);
                setIsDirty(false);
                setMessage({ type: 'success', text: 'Changes saved successfully.' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to save changes.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleWordClick = (word: string) => {
        if (editMode !== 'vocab') return;
        const cleanWord = word.replace(/[.,!?;:()\"]/g, '').trim();
        if (!cleanWord) return;

        const currentVocab = content.vocabulary || [];
        const exists = currentVocab.find((v: any) => v.word.toLowerCase() === cleanWord.toLowerCase());

        let newVocabList;
        if (exists) {
            newVocabList = currentVocab.filter((v: any) => v.word.toLowerCase() !== cleanWord.toLowerCase());
        } else {
            newVocabList = [...currentVocab, {
                id: `vocab-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, // Generate unique ID
                word: cleanWord,
                definition: '',
                lemma: '',
                context_match: false
            }];
        }

        setActiveLesson({ ...content, vocabulary: newVocabList });
        setIsDirty(true);
    };

    const generatePrompt = () => {
        // Filter only items that need update (empty kr or empty definition)
        const targetChunks = content.chunks.filter((c: any) => !c.kr).map((c: any) => ({
            id: c.id,
            en: c.en,
            kr: ""
        }));

        const targetVocab = content.vocabulary.filter((v: any) => !v.definition).map((v: any) => ({
            id: v.id,
            word: v.word,
            definition: ""
        }));

        if (targetChunks.length === 0 && targetVocab.length === 0) {
            setMessage({ type: 'success', text: 'Nothing to update (all fields filled).' });
            return;
        }

        const prompt = `Use the context below to fill in the missing Korean translations/definitions for the provided items.

**Context (Full Text):**
${content.original_text || ""}
${content.context_desc ? `(${content.context_desc})` : ""}

**Items to Fill:**
Chunks: ${JSON.stringify(targetChunks)}
Vocabulary: ${JSON.stringify(targetVocab)}

**Instructions:**
1. **Chunks**: Provide natural Korean translation for the 'kr' field.
2. **Vocabulary**: Provide 'definition' and 'lemma'.
3. **Format**: Return a SINGLE JSON object containing ONLY the arrays of modified items. Preserve IDs exactly.
{
  "chunks": [ { "id": "...", "kr": "..." }, ... ],
  "vocabulary": [ { "id": "...", "word": "...", "definition": "...", "lemma": "..." }, ... ]
}
Do not include markdown formatting. Just the raw JSON.`;

        setGeneratedPrompt(prompt);
        navigator.clipboard.writeText(prompt);
        setMessage({ type: 'success', text: `Copied changes prompt (${targetChunks.length} chunks, ${targetVocab.length} words)!` });
    };

    const handleDeleteVocab = (vocabId: string) => {
        const currentVocab = content.vocabulary || [];
        const newVocabList = currentVocab.filter((v: any) => v.id !== vocabId);
        setActiveLesson({
            ...content,
            vocabulary: newVocabList
        });
        setIsDirty(true);
    };

    // Helper: Check if selection is contiguous
    const isContiguous = () => {
        if (selectedIndices.length < 2) return false;
        const sorted = [...selectedIndices].sort((a, b) => a - b);
        for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i] + 1 !== sorted[i + 1]) return false;
        }
        return true;
    };

    const handleChunkClick = (chunkIndex: number) => {
        if (editMode === 'vocab') return; // Disable chunk selection in vocab mode
        if (selectedIndices.includes(chunkIndex)) {
            setSelectedIndices(selectedIndices.filter(i => i !== chunkIndex));
        } else {
            setSelectedIndices([...selectedIndices, chunkIndex]);
        }
    };

    const handleMerge = () => {
        if (!isContiguous()) return;

        const sorted = [...selectedIndices].sort((a, b) => a - b);
        const firstIdx = sorted[0];

        // Merge chunks
        const chunksToMerge = sorted.map(i => content.chunks[i]);
        const newChunk = {
            order: chunksToMerge[0].order,
            en: chunksToMerge.map(c => c.en).join(' '),
            kr: chunksToMerge.map(c => c.kr).join(' ')
        };

        const newChunks = [...content.chunks];
        // Remove old chunks and insert new one
        newChunks.splice(firstIdx, sorted.length, newChunk);

        setActiveLesson({
            ...content,
            chunks: newChunks
        });
        setSelectedIndices([]); // Clear selection
        setIsDirty(true);
        setMessage({ type: 'success', text: 'Chunks Merged (unsaved).' });
    };

    const handleSplitRequest = (chunkIndex: number, wordIndex: number) => {
        const chunkFn = content.chunks[chunkIndex];
        const words = chunkFn.en.split(' ');

        const part1En = words.slice(0, wordIndex + 1).join(' ');
        const part2En = words.slice(wordIndex + 1).join(' ');

        const part1 = { en: part1En, kr: '' } as any; // Manual Input
        const part2 = { en: part2En, kr: '' } as any;

        const newChunks = [...content.chunks];
        newChunks.splice(chunkIndex, 1, part1, part2);

        setActiveLesson({
            ...content,
            chunks: newChunks
        });
        setIsDirty(true);
        setMessage({ type: 'success', text: 'Chunk Split (unsaved).' });
    };

    const handleUpdateChunk = (chunkIndex: number, text: string) => {
        const newChunks = [...content.chunks];
        newChunks[chunkIndex] = { ...newChunks[chunkIndex], kr: text };

        setActiveLesson({ ...content, chunks: newChunks });
        setIsDirty(true);
    };

    const handleUpdateVocab = (vocabId: string, field: 'definition' | 'lemma' | 'word', value: string) => {
        const newVocabList = content.vocabulary?.map((v: any) =>
            v.id === vocabId ? { ...v, [field]: value } : v
        );
        setActiveLesson({ ...content, vocabulary: newVocabList });
        setIsDirty(true);
    };

    const handleImport = async (mode: 'overwrite' | 'append') => {
        if (!jsonInput) return;
        setIsImporting(true);
        try {
            // 1. Parse Input
            let parsed = JSON.parse(jsonInput);

            // If it's an array, take the first item, or treat user intent as "Import this lesson content"
            const inputObj = Array.isArray(parsed) ? parsed[0] : parsed;

            // 2. MERGE LOGIC (Safe Patch)
            const newContent = { ...content };
            let updatedCount = 0;

            if (inputObj.chunks && Array.isArray(inputObj.chunks)) {
                newContent.chunks = newContent.chunks.map((c: any, idx: number) => {
                    // Try to find match by english text (normalized)
                    let match = inputObj.chunks.find((ic: any) =>
                        ic.en && c.en && ic.en.trim().toLowerCase() === c.en.trim().toLowerCase()
                    );

                    // Fallback: match by order if available
                    if (!match && c.order) {
                        match = inputObj.chunks.find((ic: any) => ic.order === c.order);
                    }

                    // Fallback 2: match by array index if input array has same length (dangerous but useful)
                    // Only use if no other method worked
                    // if (!match && inputObj.chunks.length === newContent.chunks.length) {
                    //    match = inputObj.chunks[idx];
                    // }

                    if (match && match.kr) {
                        updatedCount++;
                        return { ...c, kr: match.kr };
                    }
                    return c;
                });
            }

            if (inputObj.vocabulary && Array.isArray(inputObj.vocabulary)) {
                newContent.vocabulary = newContent.vocabulary.map((v: any) => {
                    // Match by word
                    const match = inputObj.vocabulary.find((iv: any) =>
                        iv.word.toLowerCase() === v.word.toLowerCase()
                    );

                    if (match && match.definition) {
                        updatedCount++;
                        return { ...v, definition: match.definition, lemma: match.lemma || v.lemma };
                    }
                    return v;
                });
            }

            // 3. Update Local State
            setActiveLesson(newContent);
            setIsDirty(true);
            setMessage({ type: 'success', text: 'Content Imported (unsaved).' });
            setShowImportModal(false);
            setJsonInput('');
        } catch (e) {
            console.error(e);
            setMessage({ type: 'error', text: 'Invalid JSON format or Server Error.' });
        } finally {
            setIsImporting(false);
        }
    };


    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center border-b border-border-secondary pb-4">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" onClick={onClose}>
                        &larr; Back to Dashboard
                    </Button>
                    <div>
                        <h2 className="text-title2 font-bold">Editing: Lesson {activeLesson.order}</h2>
                        <p className="text-small text-foreground-tertiary">ID: {activeLesson.id}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="primary" size="small" onClick={handleSave} disabled={!isDirty} className={isDirty ? 'animate-pulse' : ''}>
                        Save Changes 💾
                    </Button>
                    <Button variant="secondary" size="small" onClick={() => setShowImportModal(true)}>
                        Import Changes
                    </Button>
                </div>
            </div>

            {!hasContent ? (
                <Card level="1" padding="large" className="min-h-[400px] flex flex-col items-center justify-center text-foreground-tertiary">
                    <p className="mb-4">No content yet. Import JSON from Gemini.</p>
                    <Button variant="secondary" onClick={() => setShowImportModal(true)}>Import JSON</Button>
                </Card>
            ) : (
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        {/* Single Content Block (The Lesson Itself) */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="soft" color="gray">Content</Badge>
                                {content.context_desc && <p className="text-small text-foreground-tertiary italic">{content.context_desc}</p>}
                            </div>
                            <Card level="1" padding="large" className="space-y-4 transition-all">
                                <h3 className="tex-title3 font-bold mb-2 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <span>Visual Editor</span>
                                        <div className="flex bg-background-secondary rounded-8 p-1 gap-1">
                                            <button
                                                onClick={() => setEditMode('structure')}
                                                className={`px-3 py-1 rounded-4 text-small font-bold transition-all ${editMode === 'structure' ? 'bg-accent-default text-white shadow-sm' : 'text-foreground-secondary hover:text-foreground-primary'}`}
                                            >
                                                Structure
                                            </button>
                                            <button
                                                onClick={() => setEditMode('vocab')}
                                                className={`px-3 py-1 rounded-4 text-small font-bold transition-all ${editMode === 'vocab' ? 'bg-semantic-green text-white shadow-sm' : 'text-foreground-secondary hover:text-foreground-primary'}`}
                                            >
                                                Vocabulary
                                            </button>
                                        </div>
                                    </div>
                                </h3>
                                <div className={`p-4 bg-background-level0 rounded-8 border text-regular leading-relaxed select-none ${editMode === 'vocab' ? 'border-semantic-green cursor-text' : 'border-border-secondary'}`}>
                                    {content.chunks?.map((chunk: any, i: number) => {
                                        const isSelected = selectedIndices.includes(i);
                                        const words = chunk.en.split(' ');

                                        return (
                                            <span
                                                key={i}
                                                onClick={(e) => {
                                                    handleChunkClick(i);
                                                }}
                                                className={`
                                                            inline-block rounded px-2 py-1 m-0.5 transition-all border
                                                            ${editMode === 'structure' ? 'cursor-pointer' : ''}
                                                            ${isSelected && editMode === 'structure'
                                                        ? 'bg-accent-default/20 border-accent-default text-accent-default'
                                                        : 'bg-background-secondary border-transparent'}
                                                            ${editMode === 'structure' && !isSelected ? 'hover:border-accent-default/30' : ''}
                                                        `}
                                            >
                                                {words.map((word: string, wIdx: number) => {
                                                    const cleanWord = word.replace(/[.,!?;:()\"]/g, '').trim();
                                                    const isVocab = content.vocabulary?.some((v: any) => v.word.toLowerCase() === cleanWord.toLowerCase());

                                                    return (
                                                        <span
                                                            key={wIdx}
                                                            className={`group/word relative ${editMode === 'vocab' ? 'hover:text-semantic-green font-medium cursor-pointer' : ''} ${isVocab ? 'text-semantic-green underline decoration-semantic-green/50' : ''}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleWordClick(word);
                                                            }}
                                                        >
                                                            {word}{' '}
                                                            {wIdx < words.length - 1 && editMode === 'structure' && (
                                                                <span
                                                                    className="absolute -right-2 top-0 h-full w-4 flex items-center justify-center opacity-0 group-hover/word:opacity-100 z-10 cursor-col-resize text-foreground-tertiary hover:text-accent-default"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (confirm(`Split after "${word}"?`)) {
                                                                            handleSplitRequest(i, wIdx);
                                                                        }
                                                                    }}
                                                                >
                                                                    ✂️
                                                                </span>
                                                            )}
                                                        </span>
                                                    );
                                                })}
                                                <input
                                                    className="block w-full text-[10px] text-foreground-tertiary mt-1 bg-transparent border-none p-0 focus:ring-0 focus:bg-background-secondary rounded-2 transition-colors"
                                                    value={chunk.kr || ''}
                                                    onChange={(e) => handleUpdateChunk(i, e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    placeholder="Add translation..."
                                                />
                                            </span>
                                        );
                                    })}
                                </div>
                            </Card>

                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-4">
                                <Card level="1" padding="medium">
                                    <h4 className="font-bold mb-2">Metadata</h4>
                                    <div className="text-small space-y-1">
                                        <p>Word Count: {content.original_text?.split(' ').length || 0}</p>
                                        <p>Chunks: {content.chunks?.length || 0}</p>
                                        <p>Vocab: {content.vocabulary?.length || 0}</p>
                                        <p>Quizzes: {content.quizzes?.length || 0}</p>
                                    </div>
                                </Card>
                                <Card level="1" padding="medium">
                                    <h4 className="font-bold mb-2">Translation Preview</h4>
                                    <p className="text-small text-foreground-secondary leading-relaxed whitespace-pre-wrap line-clamp-4 hover:line-clamp-none transition-all">
                                        {content.translation_kr}
                                    </p>
                                </Card>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Vocabulary Editor */}
                    <div className="space-y-4">
                        <Card level="1" padding="medium" className="sticky top-6 h-fit max-h-[calc(100vh-100px)] overflow-hidden flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-title3 font-bold">Vocabulary</h3>
                                <Button variant="ghost" size="small" onClick={generatePrompt} className="text-accent-default">
                                    Copy Changes 📋
                                </Button>
                                <Button variant="ghost" size="small" onClick={() => {
                                    const newVocab = [...(content.vocabulary || []), {
                                        id: `vocab-${Date.now()}`,
                                        lesson_id: content.id,
                                        word: "New Word",
                                        definition: "",
                                        lemma: "",
                                        context_match: false
                                    }];
                                    setActiveLesson({ ...content, vocabulary: newVocab });
                                    setIsDirty(true);
                                }} className="text-semantic-green">
                                    + Add Word
                                </Button>
                            </div>

                            <div className="bg-background-secondary p-3 rounded-8 mb-4 text-small text-foreground-tertiary">
                                <p>1. Switch to <strong>Vocabulary Mode</strong>.</p>
                                <p>2. Click words in the text to add/remove.</p>
                                <p>3. Copy Prompt & Ask Gemini to regenerate.</p>
                            </div>

                            {/* LIST */}
                            <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                                {(!content.vocabulary || content.vocabulary.length === 0) && (
                                    <p className="text-small text-foreground-tertiary text-center py-4">No vocabulary selected.</p>
                                )}
                                {content.vocabulary?.map((v: any) => (
                                    <div key={v.id} className="group p-2 bg-background-level0 rounded-8 border border-border-secondary flex justify-between items-center hover:border-accent-default transition-all">
                                        <div className="flex-1 mr-2">
                                            <input
                                                className="font-bold text-small bg-transparent border-none p-0 w-full focus:ring-0 focus:bg-background-level0 transition-colors"
                                                value={v.word}
                                                onChange={(e) => handleUpdateVocab(v.id, 'word', e.target.value)}
                                            />
                                            {/* Lemma Input */}
                                            <input
                                                className="w-full text-[11px] text-foreground-tertiary bg-transparent border-none p-0 focus:ring-0 focus:bg-background-primary rounded-2 transition-colors mb-1"
                                                value={v.lemma || ''}
                                                onChange={(e) => handleUpdateVocab(v.id, 'lemma', e.target.value)}
                                                placeholder="Lemma (root)..."
                                            />
                                            <input
                                                className="w-full text-small text-foreground-secondary bg-transparent border-none p-0 focus:ring-0 focus:bg-background-primary rounded-2 transition-colors"
                                                value={v.definition || ''}
                                                onChange={(e) => handleUpdateVocab(v.id, 'definition', e.target.value)}
                                                placeholder="Add definition..."
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleDeleteVocab(v.id)}
                                            className="text-foreground-tertiary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Floating Merge Action Bar */}
                    {selectedIndices.length > 0 && (
                        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
                            <div className="bg-background-primary border border-border-primary shadow-2xl rounded-full px-6 py-3 flex items-center gap-4">
                                <span className="text-regular font-bold text-foreground-primary">
                                    {selectedIndices.length} items
                                </span>
                                <div className="h-4 w-px bg-border-secondary"></div>

                                {isContiguous() ? (
                                    <Button
                                        variant="primary"
                                        onClick={handleMerge}
                                        className="rounded-full shadow-lg shadow-accent-default/20"
                                    >
                                        Merge Selected ✨
                                    </Button>
                                ) : (
                                    <span className="text-small text-semantic-red flex items-center gap-1">
                                        <span>⚠️</span> Select contiguous
                                    </span>
                                )}

                                <button
                                    onClick={() => setSelectedIndices([])}
                                    className="ml-2 text-foreground-tertiary hover:text-foreground-primary transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Import Modal */}
                    {showImportModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
                            <Card level="2" padding="large" className="w-full max-w-2xl max-h-[80vh] flex flex-col">
                                <h3 className="text-title3 font-bold mb-4">Import Content JSON</h3>
                                <p className="text-small text-foreground-tertiary mb-2">Paste the JSON object/array from Gemini here.</p>
                                <TextArea
                                    className="flex-1 min-h-[300px] font-mono text-small"
                                    placeholder='{ "original_text": "...", "chunks": [...] }'
                                    value={jsonInput}
                                    onChange={e => setJsonInput(e.target.value)}
                                />
                                <div className="flex justify-end gap-2 mt-4">
                                    <Button variant="ghost" onClick={() => setShowImportModal(false)}>Cancel</Button>
                                    <Button variant="primary" onClick={() => handleImport('overwrite')} disabled={isImporting}>
                                        Import
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
