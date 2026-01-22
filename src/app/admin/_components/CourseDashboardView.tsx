'use client';

import React, { useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { TextArea } from '@/components/TextArea';
import {
    Course,
    Section,
    LessonWithChildren
} from '@/actions/course-actions';
import { Message, ConfirmDialog } from './types';

export interface CourseDashboardViewProps {
    selectedCourse: Course | null;
    activeLesson: LessonWithChildren | null;
    selectedSection: Section | null;
    sections: Section[];
    allLessons: any[];
    lessons: any[];
    handleSelectCourse: (course: Course) => Promise<void>;
    handleSelectSection: (section: Section) => Promise<void>;
    createSection: (courseId: string, title: string) => Promise<any>;
    getLessonSummaries: (sectionId: string) => Promise<any[]>;
    getLesson: (lessonId: string) => Promise<LessonWithChildren | null | undefined>;
    createLesson: (courseId: string, sectionId: string, lessonId: string) => Promise<any>;
    updateLesson: (lessonId: string, content: any[], options?: any) => Promise<any>;
    deleteSection: (sectionId: string) => Promise<void | { success: boolean }>;
    deleteLesson: (lessonId: string) => Promise<void | { success: boolean }>;
    deleteAllLessonsInSection: (sectionId: string) => Promise<void | { success: boolean }>;
    mergeLessons: (firstId: string, secondId: string) => Promise<void | { success: boolean }>;
    setActiveLesson: (lesson: LessonWithChildren | null) => void;
    setLessons: (lessons: any[]) => void;
    setSelectedSection: (section: Section | null) => void;
    setIsLoading: (loading: boolean) => void;
    setMessage: (msg: Message | null) => void;
}

export const CourseDashboardView = ({
    selectedCourse,
    activeLesson,
    selectedSection,
    sections,
    allLessons,
    lessons,
    handleSelectCourse,
    handleSelectSection,
    createSection,
    getLessonSummaries,
    getLesson,
    createLesson,
    updateLesson,
    deleteSection,
    deleteLesson,
    deleteAllLessonsInSection,
    mergeLessons,
    setActiveLesson,
    setLessons,
    setSelectedSection,
    setIsLoading,
    setMessage
}: CourseDashboardViewProps) => {
    const [isCreatingSection, setIsCreatingSection] = useState(false);
    const [isCreatingLesson, setIsCreatingLesson] = useState(false);
    const [importMode, setImportMode] = useState<'create' | 'update'>('create');
    const [newSectionTitle, setNewSectionTitle] = useState('');
    const [newSectionId, setNewSectionId] = useState('');
    const [newLessonTitle, setNewLessonTitle] = useState('');
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);

    if (!selectedCourse || activeLesson) return null;

    const handleCreateSection = async () => {
        if (!newSectionTitle || !newSectionId) return;
        setIsLoading(true);
        try {
            await createSection(selectedCourse.id, newSectionTitle);
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

    const handleImportLesson = async (jsonText: string) => {
        if (!selectedSection) return;
        setIsLoading(true);
        try {
            let parsed;
            try {
                parsed = JSON.parse(jsonText);
            } catch (e) {
                setMessage({ type: 'error', text: 'Invalid JSON Syntax' });
                setIsLoading(false);
                return;
            }

            let jsonItems: any[] = Array.isArray(parsed) ? parsed : [parsed];

            // Schema Validation
            const errors: string[] = [];
            jsonItems.forEach((item, idx) => {
                if (typeof item !== 'object' || item === null) {
                    errors.push(`Item ${idx}: Not an object`);
                    return;
                }
                if (importMode === 'update' && !item.id) {
                    errors.push(`Item ${idx}: Missing 'id' for update`);
                }
                if (item.chunks && !Array.isArray(item.chunks)) {
                    errors.push(`Item ${idx}: 'chunks' must be an array`);
                }
                if (item.vocabulary && !Array.isArray(item.vocabulary)) {
                    errors.push(`Item ${idx}: 'vocabulary' must be an array`);
                }
                // Deep validation for chunks/vocab could be added here
                if (item.chunks) {
                    item.chunks.forEach((c: any, cIdx: number) => {
                        if (typeof c.en !== 'string' && typeof c.kr !== 'string') {
                            // Loose check, maybe just warn?
                        }
                    });
                }
            });

            if (errors.length > 0) {
                setMessage({ type: 'error', text: `Validation Error: ${errors[0]}` });
                setIsLoading(false);
                return;
            }

            const currentLessons = await getLessonSummaries(selectedSection.id);
            let importedCount = 0;
            let updatedCount = 0;

            for (let i = 0; i < jsonItems.length; i++) {
                const item = jsonItems[i];
                const existingSummary = item.id ? currentLessons.find(l => l.id === item.id) : null;

                if (existingSummary) {
                    const fullLesson = await getLesson(existingSummary.id);
                    if (fullLesson) {
                        const currentLesson = fullLesson as any;
                        const newChunks = currentLesson.chunks.map((c: any) => {
                            // Match by en text (normalized)
                            let match = item.chunks?.find((ic: any) =>
                                ic.en && c.en && ic.en.trim().toLowerCase() === c.en.trim().toLowerCase()
                            );
                            if (!match && c.order) {
                                match = item.chunks?.find((ic: any) => ic.order === c.order);
                            }
                            return match && match.kr ? { ...c, kr: match.kr } : c;
                        });

                        // Merge Vocabulary (Update + Add)
                        const currentVocab = currentLesson.vocabulary || [];
                        const inputVocab = item.vocabulary || [];

                        const newVocab = [...currentVocab];

                        inputVocab.forEach((iv: any) => {
                            const existingIndex = newVocab.findIndex((v: any) => v.word.toLowerCase() === iv.word.toLowerCase());
                            if (existingIndex >= 0) {
                                // Update existing
                                newVocab[existingIndex] = {
                                    ...newVocab[existingIndex],
                                    definition: iv.definition || newVocab[existingIndex].definition,
                                    lemma: iv.lemma || newVocab[existingIndex].lemma
                                };
                            } else {
                                // Add new
                                newVocab.push({
                                    word: iv.word,
                                    definition: iv.definition || '',
                                    lemma: iv.lemma || '',
                                    context_match: true
                                });
                            }
                        });

                        const mergedContent = { ...currentLesson, chunks: newChunks, vocabulary: newVocab };
                        await updateLesson(currentLesson.id, [mergedContent]);
                        updatedCount++;
                    }
                } else {
                    const lessonId = `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    const lesson = await createLesson(selectedCourse.id, selectedSection.id, lessonId);
                    await updateLesson(lesson.id, [item], { sub_lesson_count: 1 });
                    importedCount++;
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }

            await handleSelectSection(selectedSection); // Reload lessons
            setMessage({ type: 'success', text: `Result: ${updatedCount} Updated, ${importedCount} Created.` });
            setIsCreatingLesson(false);
        } catch (e) {
            console.error(e);
            setMessage({ type: 'error', text: 'Failed to import. Server error.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateSectionPrompt = async () => {
        if (!selectedSection) return;
        setIsLoading(true);
        try {
            // Need to fetch full content for all lessons in section
            const fullLessons = await Promise.all(lessons.map((l: any) => getLesson(l.id)));
            const validLessons = fullLessons.filter(l => l !== undefined && l !== null) as LessonWithChildren[];

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
                                                    await deleteSection(section.id);
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
                                                                await deleteAllLessonsInSection(selectedSection.id);
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
                                                handleImportLesson(newLessonTitle);
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
                                                <div className="flex gap-1.5 ml-2">
                                                    <Badge variant="soft" color="blue" className="px-1.5 py-0 text-[10px] h-5">
                                                        {lesson.chunkCount} chunks
                                                    </Badge>
                                                    <Badge variant="soft" color="purple" className="px-1.5 py-0 text-[10px] h-5">
                                                        {lesson.totalWordCount || 0} words
                                                    </Badge>
                                                    <Badge variant="soft" color="green" className="px-1.5 py-0 text-[10px] h-5">
                                                        {lesson.vocabularyCount || 0} voca
                                                    </Badge>
                                                </div>
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
                                                                await deleteLesson(lesson.id);
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
                                                                    await mergeLessons(lesson.id, nextLesson.id);
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
                                                    const fullLesson = await getLesson(lesson.id);
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

            {/* Local Confirmation Dialog */}
            {confirmDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
                    <Card level="2" padding="large" className="w-full max-w-sm">
                        <h3 className="text-title3 font-bold mb-2">{confirmDialog.title}</h3>
                        <p className="text-small text-foreground-tertiary mb-4">{confirmDialog.message}</p>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setConfirmDialog(null)}>Cancel</Button>
                            <Button variant="danger" onClick={() => {
                                confirmDialog.onConfirm();
                                setConfirmDialog(null);
                            }}>Confirm</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};
