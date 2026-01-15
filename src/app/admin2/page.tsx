'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { TextArea } from '@/components/TextArea';
import {
    getAllCoursesV3 as getAllCoursesV2,
    createCourseV3 as createCourseV2,
    getSectionsV3 as getSectionsV2,
    createSectionV3 as createSectionV2,
    getLessonSummariesV3 as getLessonSummariesV2,
    getAllLessonsV3 as getAllLessonsV2,
    createLessonV3 as createLessonV2,
    updateLessonV3 as updateLessonV2,
    getLessonV3 as getLessonV2,
    deleteCourseV3 as deleteCourseV2,
    deleteSectionV3 as deleteSectionV2,
    deleteLessonV3 as deleteLessonV2,
    deleteAllLessonsInSectionV3 as deleteAllLessonsInSectionV2,
    mergeLessonsV3 as mergeLessonsV2,
    migrateV2toV3,
    CourseDataV3 as CourseDataV2,
    SectionDataV3 as SectionDataV2,
    LessonDataV3 as LessonDataV2,
    LessonWithChildren
} from '@/actions/course-actions-v3';

// Extracted Editor Component to fix re-render/focus issues
interface EditorViewProps {
    activeLesson: LessonWithChildren | null;
    setActiveLesson: (lesson: LessonWithChildren | null) => void;
    editMode: 'structure' | 'vocab';
    setEditMode: (mode: 'structure' | 'vocab') => void;
    message: { type: 'success' | 'error', text: string } | null;
    setMessage: (msg: { type: 'success' | 'error', text: string } | null) => void;
    setIsLoading: (loading: boolean) => void;
}

const EditorView = ({
    activeLesson,
    setActiveLesson,
    editMode,
    setEditMode,
    message,
    setMessage,
    setIsLoading
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
    const [generatedPrompt, setGeneratedPrompt] = useState('');

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const saved = await updateLessonV2(activeLesson.id, [content]);
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
        const cleanWord = word.replace(/[.,!?;:()"]/g, '').trim();
        if (!cleanWord) return;

        const currentVocab = content.vocabulary || [];
        const exists = currentVocab.find((v: any) => v.word.toLowerCase() === cleanWord.toLowerCase());

        let newVocabList;
        if (exists) {
            newVocabList = currentVocab.filter((v: any) => v.word.toLowerCase() !== cleanWord.toLowerCase());
        } else {
            newVocabList = [...currentVocab, {
                id: `vocab-${Date.now()}`,
                lesson_id: activeLesson.id,
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
            en: chunksToMerge.map(c => c.en).join(' '),
            kr: chunksToMerge.map(c => c.kr).join(' '),
            lemma: chunksToMerge.map(c => c.lemma || []).flat()
        } as any;

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
                newContent.chunks = newContent.chunks.map((c: any) => {
                    const match = inputObj.chunks.find((ic: any) => ic.id === c.id);
                    if (match && match.kr) {
                        updatedCount++;
                        return { ...c, kr: match.kr };
                    }
                    return c;
                });
            }

            if (inputObj.vocabulary && Array.isArray(inputObj.vocabulary)) {
                newContent.vocabulary = newContent.vocabulary.map((v: any) => {
                    const match = inputObj.vocabulary.find((iv: any) => iv.id === v.id);
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
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="small" onClick={() => setActiveLesson(null)}>
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
                                                    const cleanWord = word.replace(/[.,!?;:()"]/g, '').trim();
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

export default function AdminPage2() {
    // Top Level State
    const [courses, setCourses] = useState<CourseDataV2[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    // Lifted State for Editor (Prevents reset on re-render)
    const [editMode, setEditMode] = useState<'structure' | 'vocab'>('structure');

    // Selected Course State (Step 2)
    const [selectedCourse, setSelectedCourse] = useState<CourseDataV2 | null>(null);

    // Define extended type locally or use from V3 if exported
    type LessonWithContent = LessonWithChildren;

    const [sections, setSections] = useState<SectionDataV2[]>([]); // Sections in selected course
    const [selectedSection, setSelectedSection] = useState<SectionDataV2 | null>(null); // Selected section
    const [allLessons, setAllLessons] = useState<any[]>([]); // All lessons in the course (for badge counts)
    const [lessons, setLessons] = useState<any[]>([]); // Lessons in selected section

    // Editor State (Step 3)
    const [activeLesson, setActiveLesson] = useState<LessonWithContent | null>(null); // If set, show Editor

    // Confirmation Dialog State
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    } | null>(null);

    // Auto-dismiss message
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                setMessage(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    // Fetch courses on mount
    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        setIsLoading(true);
        try {
            const list = await getAllCoursesV2();
            setCourses(list);

            // Load all sections for all courses to display counts
            const allSections = await Promise.all(
                list.map(course => getSectionsV2(course.id))
            );
            setSections(allSections.flat());
        } catch (e) {
            console.error("Failed to load courses", e);
            setMessage({ type: 'error', text: 'Failed to load courses (V2)' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateCourse = async (title: string, id: string, desc: string, imgUrl: string) => {
        if (!title || !id) {
            setMessage({ type: 'error', text: 'Title and ID are required' });
            return;
        }
        setIsLoading(true);
        try {
            const newCourse = { id, title, description: desc, img_url: imgUrl };
            await createCourseV2(newCourse);
            await loadCourses();
            setMessage({ type: 'success', text: 'Course created successfully (V2).' });
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to create course. ID might be duplicate.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectCourse = async (course: CourseDataV2) => {
        setSelectedCourse(course);
        setSelectedSection(null); // Reset section selection
        setLessons([]); // Clear selected section lessons
        setIsLoading(true);
        try {
            const courseSections = await getSectionsV2(course.id);
            setSections(courseSections);

            // Load all lessons for badge counts
            const allCourseLessons = await getAllLessonsV2(course.id);
            setAllLessons(allCourseLessons);
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to load sections' });
        } finally {
            setIsLoading(false);
        }
    };

    // Sub-component for Course Selection (Step 1)
    const CourseSelectionView = () => {
        const [newTitle, setNewTitle] = useState('');
        const [newId, setNewId] = useState('');
        const [newDesc, setNewDesc] = useState('');
        const [newImgUrl, setNewImgUrl] = useState('');

        if (selectedCourse) return null; // Hide if selected

        return (
            <div className="grid md:grid-cols-2 gap-8">
                <Card level="1" padding="large" className="space-y-4 h-fit">
                    <h2 className="text-title3 font-bold">Existing Courses (V2)</h2>
                    <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto">
                        {courses.map(c => (
                            <div
                                key={c.id}
                                className="p-4 rounded-16 border border-border-secondary hover:border-accent-default hover:bg-background-secondary transition-all group"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <button
                                        onClick={() => handleSelectCourse(c)}
                                        className="text-left flex-1"
                                    >
                                        <p className="font-bold text-foreground-primary group-hover:text-accent-default transition-colors">{c.title}</p>
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="soft" color="gray">{sections.filter(s => s.course_id === c.id).length} sections</Badge>
                                        <Button
                                            variant="ghost"
                                            size="small"
                                            onClick={async (e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setConfirmDialog({
                                                    isOpen: true,
                                                    title: 'Delete Course',
                                                    message: `Delete course "${c.title}"? This will also delete all sections and lessons.`,
                                                    onConfirm: async () => {
                                                        setIsLoading(true);
                                                        try {
                                                            await deleteCourseV2(c.id);
                                                            await loadCourses();
                                                            setMessage({ type: 'success', text: 'Course deleted.' });
                                                        } catch (e) {
                                                            setMessage({ type: 'error', text: 'Failed to delete course.' });
                                                        } finally {
                                                            setIsLoading(false);
                                                        }
                                                    }
                                                });
                                            }}
                                            className="text-red-500 hover:text-red-600"
                                        >
                                            🗑️
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-small text-foreground-tertiary line-clamp-2">{c.description}</p>
                            </div>
                        ))}
                        {courses.length === 0 && !isLoading && (
                            <p className="text-foreground-tertiary">No courses found in V2 table.</p>
                        )}
                        {isLoading && courses.length === 0 && (
                            <p className="text-foreground-tertiary animate-pulse">Loading...</p>
                        )}
                    </div>
                </Card>

                <Card level="1" padding="large" className="space-y-4 h-fit sticky top-6">
                    <h2 className="text-title3 font-bold">Create New Course (V2)</h2>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-small font-medium text-foreground-secondary">Course ID (Slug)</label>
                            <input
                                className="w-full bg-background-secondary border border-border-primary rounded-8 px-3 py-2 text-foreground-primary focus:outline-none focus:border-accent-default transition-all"
                                placeholder="e.g. bitcoin-whitepaper"
                                value={newId}
                                onChange={e => setNewId(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-small font-medium text-foreground-secondary">Title</label>
                            <input
                                className="w-full bg-background-secondary border border-border-primary rounded-8 px-3 py-2 text-foreground-primary focus:outline-none focus:border-accent-default transition-all"
                                placeholder="e.g. Bitcoin Whitepaper"
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-small font-medium text-foreground-secondary">Thumbnail URL</label>
                            <input
                                className="w-full bg-background-secondary border border-border-primary rounded-8 px-3 py-2 text-foreground-primary focus:outline-none focus:border-accent-default transition-all"
                                placeholder="https://..."
                                value={newImgUrl}
                                onChange={e => setNewImgUrl(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-small font-medium text-foreground-secondary">Description</label>
                            <TextArea
                                placeholder="Short description..."
                                className="text-regular max-h-32"
                                value={newDesc}
                                onChange={e => setNewDesc(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="primary"
                            className="w-full"
                            onClick={() => handleCreateCourse(newTitle, newId, newDesc, newImgUrl)}
                            disabled={isLoading}
                        >
                            Create Course V2
                        </Button>
                    </div>
                </Card>
            </div>
        );
    };

    // Sub-component for Dashboard (Step 2) - Section-Based
    const CourseDashboardView = () => {
        const [isCreatingSection, setIsCreatingSection] = useState(false);
        const [isCreatingLesson, setIsCreatingLesson] = useState(false);
        const [importMode, setImportMode] = useState<'create' | 'update'>('create');
        const [newSectionTitle, setNewSectionTitle] = useState('');
        const [newSectionId, setNewSectionId] = useState('');
        const [newLessonTitle, setNewLessonTitle] = useState(''); // Reused for JSON input

        if (!selectedCourse || activeLesson) return null;

        const handleCreateSection = async () => {
            if (!newSectionTitle || !newSectionId) return;
            setIsLoading(true);
            try {
                await createSectionV2(selectedCourse.id, newSectionTitle);
                await handleSelectCourse(selectedCourse);
                setMessage({ type: 'success', text: 'Section created.' });
                setIsCreatingSection(false);
                setNewSectionTitle('');
                setNewSectionId('');
            } catch (e) {
                setMessage({ type: 'error', text: 'Failed to create section.' });
            } finally {
                setIsLoading(false);
            }
        };

        const handleSelectSection = async (section: SectionDataV2) => {
            setSelectedSection(section);
            setIsLoading(true);
            try {
                const sectionLessons = await getLessonSummariesV2(section.id);
                // No need to filter locally if API does it, but double check
                // getLessonSummariesV3 returns exact section lessons
                setLessons(sectionLessons);
            } catch (e) {
                setMessage({ type: 'error', text: 'Failed to load lessons' });
            } finally {
                setIsLoading(false);
            }
        };

        const handleImportLesson = async (jsonText: string) => {
            if (!selectedSection) return;
            setIsLoading(true);
            try {
                // Parse JSON
                let parsed = JSON.parse(jsonText);
                let jsonItems: any[] = [];

                if (Array.isArray(parsed)) {
                    jsonItems = parsed;
                } else {
                    jsonItems = [parsed];
                }

                // Get current lesson count once before the loop
                const currentLessons = await getLessonSummariesV2(selectedSection.id);
                // We need full details to match IDs? No, summaries have IDs.

                let importedCount = 0;
                let updatedCount = 0;

                // Process each item
                for (let i = 0; i < jsonItems.length; i++) {
                    const item = jsonItems[i];

                    // Check if update or create
                    const existingSummary = item.id ? currentLessons.find(l => l.id === item.id) : null;

                    if (existingSummary) {
                        // UPDATE with Merge
                        // We need the FULL lesson to merge properly
                        const fullLesson = await getLessonV2(existingSummary.id);
                        if (fullLesson) {
                            const currentLesson = fullLesson as any;
                            const newChunks = currentLesson.chunks.map((c: any) => {
                                const match = item.chunks?.find((ic: any) => ic.id === c.id);
                                return match && match.kr ? { ...c, kr: match.kr } : c;
                            });
                            const newVocab = currentLesson.vocabulary?.map((v: any) => {
                                const match = item.vocabulary?.find((iv: any) => iv.id === v.id);
                                return match && match.definition ? { ...v, definition: match.definition } : v;
                            }) || [];

                            const mergedContent = { ...currentLesson, chunks: newChunks, vocabulary: newVocab };
                            await updateLessonV2(currentLesson.id, [mergedContent]);
                            updatedCount++;
                        }
                    } else {
                        // Create New
                        const lessonId = `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        const lesson = await createLessonV2(selectedCourse.id, selectedSection.id, lessonId);
                        await updateLessonV2(lesson.id, [item], { sub_lesson_count: 1 });
                        importedCount++;

                        // Small delay
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }
                }

                await handleSelectSection(selectedSection);

                setMessage({ type: 'success', text: `Result: ${updatedCount} Updated, ${importedCount} Created.` });
                setIsCreatingLesson(false);
            } catch (e) {
                console.error(e);
                setMessage({ type: 'error', text: 'Failed to import. Check JSON format.' });
            } finally {
                setIsLoading(false);
            }
        };

        const handleGenerateSectionPrompt = async () => {
            if (!selectedSection) return;
            setIsLoading(true);
            try {
                const fullLessons = await Promise.all(lessons.map(l => getLessonV2(l.id)));
                const validLessons = fullLessons.filter(l => l !== undefined) as LessonWithChildren[];

                // Filter for Partial Updates
                const payload = validLessons.map(l => {
                    const targetChunks = l.chunks?.filter((c: any) => !c.kr).map((c: any) => ({
                        id: c.id, en: c.en, kr: ""
                    })) || [];
                    const targetVocab = l.vocabulary?.filter((v: any) => !v.definition).map((v: any) => ({
                        id: v.id, word: v.word, definition: ""
                    })) || [];

                    if (targetChunks.length === 0 && targetVocab.length === 0) return null;

                    return {
                        id: l.id,
                        context_excerpt: l.original_text?.substring(0, 200) + "...",
                        chunks: targetChunks,
                        vocabulary: targetVocab
                    };
                }).filter(l => l !== null);

                if (payload.length === 0) {
                    setMessage({ type: 'success', text: 'All lessons are fully updated!' });
                    return;
                }

                const prompt = `Use this JSON data to generate the full Korean translations and vocabulary definitions.

**Instructions:**
1. **Preserve IDs**: logical 'id' fields must remain unchanged.
2. **Fill Missing**: Specifically target empty "kr" fields and empty "definition" fields.
3. **Output**: Return a SINGLE valid JSON Array containing the lesson objects with filled fields. Output ONLY the JSON.

**Input Data:**
${JSON.stringify(payload, null, 2)}`;

                navigator.clipboard.writeText(prompt);
                setMessage({ type: 'success', text: `Batch Changes Prompt for ${payload.length} lessons copied!` });
            } catch (e) {
                setMessage({ type: 'error', text: 'Failed to generate prompt.' });
            } finally {
                setIsLoading(false);
            }
        };

        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-title2 font-bold">{selectedCourse.title}</h2>
                        <p className="text-foreground-secondary">{selectedCourse.description}</p>
                    </div>
                    <Button variant="primary" onClick={() => setIsCreatingSection(true)} disabled={isCreatingSection}>
                        + Add New Section
                    </Button>
                </div>

                {isCreatingSection && (
                    <Card level="2" padding="medium" className="animate-fade-in-up border-accent-default">
                        <h3 className="font-bold mb-4">New Section Details</h3>
                        <div className="flex gap-4 items-end">
                            <div className="flex-1 space-y-1">
                                <label className="text-small text-foreground-secondary">Section ID</label>
                                <input
                                    className="w-full bg-background-secondary border border-border-primary rounded-8 px-3 py-2 text-foreground-primary focus:outline-none focus:border-accent-default transition-all"
                                    value={newSectionId}
                                    onChange={e => setNewSectionId(e.target.value)}
                                    placeholder="ch1-introduction"
                                />
                            </div>
                            <div className="flex-1 space-y-1">
                                <label className="text-small text-foreground-secondary">Section Title</label>
                                <input
                                    className="w-full bg-background-secondary border border-border-primary rounded-8 px-3 py-2 text-foreground-primary focus:outline-none focus:border-accent-default transition-all"
                                    value={newSectionTitle}
                                    onChange={e => setNewSectionTitle(e.target.value)}
                                    placeholder="Chapter 1: Introduction"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={() => setIsCreatingSection(false)}>Cancel</Button>
                                <Button variant="primary" onClick={handleCreateSection}>Create</Button>
                            </div>
                        </div>
                    </Card>
                )}

                <div className="space-y-4">
                    <h3 className="text-title3 font-bold border-b border-border-secondary pb-2">Sections</h3>

                    {sections.length === 0 && !isCreatingSection && (
                        <Card level="1" padding="large" className="text-center py-12">
                            <p className="text-foreground-tertiary mb-4">No sections yet.</p>
                            <Button variant="ghost" onClick={() => setIsCreatingSection(true)}>
                                Create First Section
                            </Button>
                        </Card>
                    )}

                    {sections.map((section) => (
                        <Card key={section.id} level="1" padding="medium" className={`transition-all ${selectedSection?.id === section.id ? 'border-accent-default' : ''}`}>
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-3">
                                    <h4 className="font-bold text-foreground-primary">{section.title}</h4>
                                    <Badge variant="soft" color="gray">{allLessons.filter(l => l.section_id === section.id).length} lessons</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="small"
                                        onClick={async (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setConfirmDialog({
                                                isOpen: true,
                                                title: 'Delete Section',
                                                message: `Delete section "${section.title}"? This will also delete all lessons in this section.`,
                                                onConfirm: async () => {
                                                    setIsLoading(true);
                                                    try {
                                                        await deleteSectionV2(section.id);
                                                        await handleSelectCourse(selectedCourse);
                                                        setSelectedSection(null);
                                                        setLessons([]);
                                                        setMessage({ type: 'success', text: 'Section deleted.' });
                                                    } catch (e) {
                                                        setMessage({ type: 'error', text: 'Failed to delete section.' });
                                                    } finally {
                                                        setIsLoading(false);
                                                    }
                                                }
                                            });
                                        }}
                                        className="text-red-500 hover:text-red-600"
                                    >
                                        🗑️
                                    </Button>
                                    <Button
                                        variant={selectedSection?.id === section.id ? "primary" : "ghost"}
                                        size="small"
                                        onClick={() => handleSelectSection(section)}
                                    >
                                        {selectedSection?.id === section.id ? 'Selected' : 'Select'} →
                                    </Button>
                                </div>
                            </div>

                            {selectedSection?.id === section.id && (
                                <div className="mt-4 pt-4 border-t border-border-secondary space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h5 className="text-small font-bold text-foreground-secondary">Lessons</h5>
                                        <div className="flex gap-2">
                                            {lessons.length > 0 && (
                                                <Button
                                                    variant="ghost"
                                                    size="small"
                                                    onClick={() => {
                                                        setConfirmDialog({
                                                            isOpen: true,
                                                            title: 'Clear All Lessons',
                                                            message: `Delete all ${lessons.length} lesson(s) in "${selectedSection.title}"? This cannot be undone.`,
                                                            onConfirm: async () => {
                                                                setIsLoading(true);
                                                                try {
                                                                    await deleteAllLessonsInSectionV2(selectedSection.id);
                                                                    await handleSelectSection(selectedSection);
                                                                    setMessage({ type: 'success', text: 'All lessons cleared.' });
                                                                } catch (e) {
                                                                    setMessage({ type: 'error', text: 'Failed to clear lessons.' });
                                                                } finally {
                                                                    setIsLoading(false);
                                                                }
                                                            }
                                                        });
                                                    }}
                                                    className="text-red-500 hover:text-red-600"
                                                >
                                                    🗑️ Clear All
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="small" onClick={handleGenerateSectionPrompt} className="text-accent-default">
                                                Copy Batch Changes 📋
                                            </Button>
                                            <Button variant="secondary" size="small" onClick={() => {
                                                setImportMode('create');
                                                setIsCreatingLesson(true);
                                            }}>
                                                + Import New
                                            </Button>
                                            <Button variant="secondary" size="small" onClick={() => {
                                                setImportMode('update');
                                                setIsCreatingLesson(true);
                                            }}>
                                                Batch Update 📋
                                            </Button>
                                        </div>
                                    </div>

                                    {isCreatingLesson && (
                                        <Card level="2" padding="medium" className="animate-fade-in-up border-accent-default">
                                            <h6 className="font-bold mb-2 text-small">
                                                {importMode === 'create' ? 'Import New Lessons (JSON)' : 'Batch Update Lessons (JSON)'}
                                            </h6>
                                            <p className="text-small text-foreground-tertiary mb-3">
                                                {importMode === 'create'
                                                    ? 'Paste JSON array. New lessons will be created. IDs matching existing lessons will be skipped or updated.'
                                                    : 'Paste JSON array. Existing lessons with matching IDs will be updated.'}
                                            </p>
                                            <TextArea
                                                className="min-h-[200px] font-mono text-small mb-3"
                                                placeholder={importMode === 'create' ? '[{"original_text": "...", "chunks": [...], ...}]' : '[{"id": "...", "chunks": [...]}]'}
                                                value={newLessonTitle}
                                                onChange={e => setNewLessonTitle(e.target.value)}
                                            />
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="small" onClick={() => {
                                                    setIsCreatingLesson(false);
                                                    setNewLessonTitle('');
                                                }}>Cancel</Button>
                                                <Button variant="primary" size="small" onClick={() => {
                                                    handleImportLesson(newLessonTitle); // Logic handles both, smart ID usage
                                                    setNewLessonTitle('');
                                                }} disabled={!newLessonTitle}>Import</Button>
                                            </div>
                                        </Card>
                                    )}

                                    {lessons.length === 0 && !isCreatingLesson && (
                                        <p className="text-small text-foreground-tertiary text-center py-4">No lessons yet.</p>
                                    )}

                                    {lessons.map((lesson) => (
                                        <div key={lesson.id} className="p-3 bg-background-level0 border border-border-secondary rounded-8 flex justify-between items-center group hover:border-accent-default transition-all">
                                            <div>
                                                <h6 className="text-small font-bold text-foreground-primary group-hover:text-accent-default flex items-center gap-2">
                                                    Lesson {lesson.order}
                                                    {/*  */}
                                                </h6>
                                                <p className="text-small text-foreground-tertiary truncate max-w-md">{lesson.preview || 'No content'}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="small"
                                                    onClick={async (e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setConfirmDialog({
                                                            isOpen: true,
                                                            title: 'Delete Lesson',
                                                            message: `Delete lesson "${lesson.title}"?`,
                                                            onConfirm: async () => {
                                                                setIsLoading(true);
                                                                try {
                                                                    await deleteLessonV2(lesson.id);
                                                                    if (selectedSection) {
                                                                        await handleSelectSection(selectedSection);
                                                                    }
                                                                    setMessage({ type: 'success', text: 'Lesson deleted.' });
                                                                } catch (e) {
                                                                    setMessage({ type: 'error', text: 'Failed to delete lesson.' });
                                                                } finally {
                                                                    setIsLoading(false);
                                                                }
                                                            }
                                                        });
                                                    }}
                                                    className="text-red-500 hover:text-red-600"
                                                >
                                                    🗑️
                                                </Button>
                                                {/* Show merge button for all lessons except the last one */}
                                                {lessons.indexOf(lesson) < lessons.length - 1 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            const nextLesson = lessons[lessons.indexOf(lesson) + 1];
                                                            setConfirmDialog({
                                                                isOpen: true,
                                                                title: 'Merge Lessons',
                                                                message: `Merge Lesson ${lesson.order} with Lesson ${nextLesson.order}? The content will be combined into Lesson ${lesson.order}.`,
                                                                onConfirm: async () => {
                                                                    setIsLoading(true);
                                                                    try {
                                                                        await mergeLessonsV2(lesson.id, nextLesson.id);
                                                                        if (selectedSection) {
                                                                            await handleSelectSection(selectedSection);
                                                                        }
                                                                        setMessage({ type: 'success', text: 'Lessons merged.' });
                                                                    } catch (e) {
                                                                        setMessage({ type: 'error', text: 'Failed to merge lessons.' });
                                                                    } finally {
                                                                        setIsLoading(false);
                                                                    }
                                                                }
                                                            });
                                                        }}
                                                        className="text-blue-500 hover:text-blue-600"
                                                    >
                                                        🔗 Merge
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="small" onClick={async () => {
                                                    setIsLoading(true);
                                                    try {
                                                        const fullLesson = await getLessonV2(lesson.id);
                                                        if (fullLesson) setActiveLesson(fullLesson);
                                                    } catch (e) {
                                                        setMessage({ type: 'error', text: 'Failed to load lesson' });
                                                    } finally {
                                                        setIsLoading(false);
                                                    }
                                                }}>
                                                    Edit →
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </div>
        );
    };






    return (
        <div className="min-h-screen bg-background-primary p-8 font-sans text-foreground-primary">
            {/* Top Bar */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-title1 font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent-default to-accent-hover">
                    Admin 2.0 (V3 Engine)
                </h1>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => window.open('/prototype', '_blank')}>
                        View Prototype
                    </Button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex items-center justify-between pb-6 border-b border-border-secondary">
                    <div className="flex items-center gap-4">
                        {selectedCourse && (
                            <Button variant="ghost" size="small" onClick={() => setSelectedCourse(null)}>
                                &larr; All Courses
                            </Button>
                        )}
                        <div>
                            <h1 className="text-title2 font-bold flex items-center gap-2">
                                Admin CMS <span className="text-accent-default">v2.0</span>
                            </h1>
                            <p className="text-small text-foreground-tertiary mt-1">
                                {selectedCourse ? `Managing: ${selectedCourse.title}` : 'Select a course to manage'}
                            </p>
                        </div>
                    </div>
                    <Link href="/admin">
                        <Button variant="ghost" size="small" className="text-foreground-tertiary">
                            &lt; Legacy Admin
                        </Button>
                    </Link>
                </header>

                {/* Main Content */}
                <main>
                    {message && (
                        <div className={`mb-6 p-4 rounded-8 flex items-center gap-2 animate-fade-in ${message.type === 'success' ? 'bg-semantic-green/10 text-semantic-green' : 'bg-semantic-red/10 text-semantic-red'}`}>
                            <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
                            {message.text}
                        </div>
                    )}

                    <CourseSelectionView />
                    <CourseDashboardView />
                    {activeLesson && (
                        <EditorView
                            activeLesson={activeLesson}
                            setActiveLesson={setActiveLesson}
                            editMode={editMode}
                            setEditMode={setEditMode}
                            message={message}
                            setMessage={setMessage}
                            setIsLoading={setIsLoading}
                        />
                    )}
                </main>

                {/* Custom Confirmation Dialog */}
                {confirmDialog && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setConfirmDialog(null)}>
                        <Card level="2" padding="large" className="max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-title3 font-bold mb-2">{confirmDialog.title}</h3>
                            <p className="text-foreground-secondary mb-6">{confirmDialog.message}</p>
                            <div className="flex gap-3 justify-end">
                                <Button variant="ghost" onClick={() => setConfirmDialog(null)}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={() => {
                                        confirmDialog.onConfirm();
                                        setConfirmDialog(null);
                                    }}
                                    className="bg-red-500 hover:bg-red-600"
                                >
                                    Delete
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
