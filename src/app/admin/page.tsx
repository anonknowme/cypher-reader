'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { TextArea } from '@/components/TextArea';
import { LessonEditor } from '@/components/LessonEditor';
import { migrateContentToDb, migrateVocabulary } from '@/actions/admin-actions'; // Removed unused for now
import { saveLessonContent, getLessonSummaries, getLessonContent, LessonData } from '@/actions/lesson-actions';
import { getAllCourses, createCourse, addLessonToCourse, updateCourseLesson, CourseData } from '@/actions/course-actions';

export default function AdminPage() {
    // Top Level State
    const [view, setView] = useState<'course-select' | 'course-dashboard' | 'lesson-editor'>('course-select');
    const [selectedCourse, setSelectedCourse] = useState<CourseData | null>(null);

    // Initial Data Fetching
    const [courses, setCourses] = useState<CourseData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Dashboard Data
    const [lessonSummaries, setLessonSummaries] = useState<{ hash: string, original_text: string, trans_kr: string }[]>([]);

    // Edit State
    const [editingLessonOldHash, setEditingLessonOldHash] = useState<string | null>(null);

    // Auto-dismiss message
    React.useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                setMessage(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    // Fetch courses on mount
    React.useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        const list = await getAllCourses();
        setCourses(list);
    };

    const handleCreateCourse = async (title: string, id: string, desc: string, imgUrl: string) => {
        if (!title || !id) return;
        try {
            const newCourse = { id, title, description: desc, img_url: imgUrl, lessons: [] };
            await createCourse(newCourse);
            await loadCourses();
            setMessage({ type: 'success', text: '코스가 생성되었습니다.' });
        } catch (e) {
            setMessage({ type: 'error', text: '코스 생성 실패 (ID 중복 등)' });
        }
    };

    const handleSelectCourse = async (course: CourseData) => {
        setSelectedCourse(course);
        setIsLoading(true);
        try {
            const summaries = await getLessonSummaries(course.lessons, course.id);
            setLessonSummaries(summaries);
            setView('course-dashboard');
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Content Creation/Editing State ---
    const [step, setStep] = useState<'input' | 'segmenting' | 'managing'>('input');
    const [sourceText, setSourceText] = useState('');
    const [segments, setSegments] = useState<{ id: number; text: string; status: 'pending' | 'draft' | 'saved'; data?: LessonData }[]>([]);
    const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);

    // Reset Content State when entering editor for NEW content
    const startNewLesson = () => {
        setSourceJson('');
        setSegments([]);
        setActiveSegmentIndex(null);
        setEditingLessonOldHash(null);
        setStep('input');
        setView('lesson-editor');
    };

    // Load EXISTING lesson for editing
    const startEditLesson = async (hash: string) => {
        if (!selectedCourse) return;
        setIsLoading(true);
        try {
            const data = await getLessonContent(hash, selectedCourse.id);
            if (!data) throw new Error("Lesson not found");

            setSegments([{ id: 0, text: data.original_text, status: 'saved', data }]);
            setActiveSegmentIndex(0);
            setEditingLessonOldHash(hash);
            setStep('managing'); // Skip input/segmenting, go straight to editor
            setView('lesson-editor');
        } catch (e) {
            setMessage({ type: 'error', text: '레슨 로딩 실패' });
        } finally {
            setIsLoading(false);
        }
    };

    // Manual JSON Import
    // const [inputMode, setInputMode] = useState<'text' | 'json'>('text'); // Removed 'text' mode
    const [sourceJson, setSourceJson] = useState('');

    const handleJsonImport = () => {
        try {
            const parsed = JSON.parse(sourceJson);
            const items = Array.isArray(parsed) ? parsed : [parsed];

            if (items.length === 0) {
                throw new Error("Empty array provided.");
            }

            // Validate all items
            items.forEach((item: any, idx: number) => {
                if (!item.original_text || !item.chunks || !item.vocabulary) {
                    throw new Error(`Item ${idx + 1} is invalid: Missing required fields (original_text, chunks, vocabulary)`);
                }
            });

            // Map each item to a segment
            const newSegments = items.map((item: LessonData, idx: number) => {
                const segmentText = item.original_text.substring(0, 100) + (item.original_text.length > 100 ? "..." : "");
                return {
                    id: idx,
                    text: segmentText,
                    status: 'draft',
                    data: item
                };
            });

            // If we are appending to existing segments (maybe in future?), for now just replace/set as the new list
            // Since this is "New Lesson" mode usually, replacing is fine.
            // If we want to support "Add to existing", we'd need to adjust IDs.
            // For now, let's assume this IS the batch.

            setSegments(newSegments as any);
            setActiveSegmentIndex(0);
            setStep('managing');
            setMessage({ type: 'success', text: `Successfully imported ${items.length} units!` });

        } catch (e: any) {
            console.error(e);
            setMessage({ type: 'error', text: e.message || 'Invalid JSON format.' });
        }
    };

    // Step 3: Save & Link (or Update)
    const handleSave = async (data: LessonData) => {
        if (activeSegmentIndex === null || !selectedCourse) return;

        setIsLoading(true); // Block UI interactions

        try {
            const result = await saveLessonContent(data, selectedCourse.id);
            const newHash = result.hash;

            if (editingLessonOldHash) {
                // We are editing an existing lesson
                if (newHash !== editingLessonOldHash) {
                    // Content changed -> Hash changed -> Update Course Manifest
                    await updateCourseLesson(selectedCourse.id, editingLessonOldHash, newHash);

                    // Update local state to reflect the change
                    const updatedSummaries = lessonSummaries.map(s => s.hash === editingLessonOldHash ? { ...s, hash: newHash, original_text: data.original_text, trans_kr: data.translation_kr } : s);
                    setLessonSummaries(updatedSummaries);

                    // Update selected course lessons list locally too
                    setSelectedCourse({
                        ...selectedCourse,
                        lessons: selectedCourse.lessons.map(h => h === editingLessonOldHash ? newHash : h)
                    });

                    setEditingLessonOldHash(newHash); // Update tracking
                }
                // If hash same, file is overwritten, no course update needed.
            } else {
                // New Lesson
                await addLessonToCourse(selectedCourse.id, newHash);

                // Update local selectedCourse state to include new lesson
                setSelectedCourse({
                    ...selectedCourse,
                    lessons: [...selectedCourse.lessons, newHash]
                });
                // Update summaries
                setLessonSummaries([...lessonSummaries, { hash: newHash, original_text: data.original_text, trans_kr: data.translation_kr }]);
            }

            // Update Segments UI
            const newSegments = [...segments];
            newSegments[activeSegmentIndex].status = 'saved';
            newSegments[activeSegmentIndex].data = data;
            setSegments(newSegments);

            if (!editingLessonOldHash) {
                setActiveSegmentIndex(null); // Close editor only for new flows, keep open for edit/refine? Or just close.
            }

            setMessage({ type: 'success', text: '저장 완료!' });
        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: '저장 실패. ' + error.message });
        } finally {
            setIsLoading(false); // Unblock UI
        }
    };

    // Components for Sub-views
    const CourseSelectionView = () => {
        const [newTitle, setNewTitle] = useState('');
        const [newId, setNewId] = useState('');
        const [newDesc, setNewDesc] = useState('');
        const [newImgUrl, setNewImgUrl] = useState('');

        return (
            <div className="grid md:grid-cols-2 gap-8">
                <Card level="1" padding="large" className="space-y-4">
                    <h2 className="text-title3 font-bold">Existing Courses</h2>
                    <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                        {courses.map(c => (
                            <button
                                key={c.id}
                                onClick={() => handleSelectCourse(c)}
                                className="text-left p-4 rounded-16 border border-border-secondary hover:border-accent-default hover:bg-background-secondary transition-all"
                            >
                                <p className="font-bold text-foreground-primary">{c.title}</p>
                                <p className="text-small text-foreground-tertiary">{c.lessons.length} lessons</p>
                            </button>
                        ))}
                        {courses.length === 0 && <p className="text-foreground-tertiary">No courses found.</p>}
                    </div>
                </Card>

                <Card level="1" padding="large" className="space-y-4 h-fit">
                    <h2 className="text-title3 font-bold">Create New Course</h2>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-small font-medium text-foreground-secondary">Course ID (Slug)</label>
                            <input
                                className="w-full bg-background-secondary border border-border-primary rounded-8 px-3 py-2 text-foreground-primary focus:outline-none focus:border-accent-default"
                                placeholder="e.g. bitcoin-whitepaper"
                                value={newId}
                                onChange={e => setNewId(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-small font-medium text-foreground-secondary">Title</label>
                            <input
                                className="w-full bg-background-secondary border border-border-primary rounded-8 px-3 py-2 text-foreground-primary focus:outline-none focus:border-accent-default"
                                placeholder="e.g. Bitcoin Whitepaper"
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-small font-medium text-foreground-secondary">Thumbnail URL (Optional)</label>
                            <input
                                className="w-full bg-background-secondary border border-border-primary rounded-8 px-3 py-2 text-foreground-primary focus:outline-none focus:border-accent-default"
                                placeholder="https://..."
                                value={newImgUrl}
                                onChange={e => setNewImgUrl(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-small font-medium text-foreground-secondary">Description</label>
                            <TextArea
                                placeholder="Short description..."
                                className="text-regular"
                                value={newDesc}
                                onChange={e => setNewDesc(e.target.value)}
                            />
                        </div>
                        <Button variant="primary" className="w-full" onClick={() => handleCreateCourse(newTitle, newId, newDesc, newImgUrl)}>
                            Create Course
                        </Button>
                    </div>
                </Card>
            </div>
        );
    };

    const CourseDashboardView = () => {
        if (!selectedCourse) return null;
        return (
            <div className="space-y-6">
                <Card level="1" padding="large" className="flex justify-between items-center">
                    <div>
                        <h2 className="text-title2 font-bold">{selectedCourse.title}</h2>
                        <p className="text-foreground-secondary">{selectedCourse.description}</p>
                        <p className="text-small text-foreground-tertiary mt-1">{selectedCourse.lessons.length} Lessons Linked</p>
                    </div>
                    <Button variant="primary" onClick={startNewLesson}>
                        + Add New Lesson Here
                    </Button>
                </Card>

                <div className="space-y-2">
                    <h3 className="text-title3 font-bold px-1">Lesson List</h3>
                    {lessonSummaries.map((summary, i) => (
                        <div
                            key={summary.hash}
                            onClick={() => startEditLesson(summary.hash)}
                            className="p-4 bg-background-level1 border border-border-secondary rounded-16 cursor-pointer hover:border-accent-default transition-all group"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-small font-bold text-foreground-tertiary group-hover:text-accent-default">Lesson {i + 1}</span>
                                <span className="text-mini font-mono text-foreground-tertiary opacity-50">{summary.hash.substring(0, 8)}...</span>
                            </div>
                            <p className="text-foreground-primary font-serif line-clamp-2 mb-1">{summary.original_text}</p>
                            <p className="text-mini text-foreground-secondary line-clamp-1">{summary.trans_kr}</p>
                        </div>
                    ))}
                    {lessonSummaries.length === 0 && (
                        <p className="text-foreground-tertiary italic p-4">No lessons yet. Add one!</p>
                    )}
                </div>
            </div>
        );
    };

    // Render Logic
    // Navigation Helpers
    const router = useRouter();

    const handleBack = () => {
        if (view === 'lesson-editor') {
            setView('course-dashboard');
        } else if (view === 'course-dashboard') {
            setView('course-select');
            setSelectedCourse(null);
        } else {
            router.push('/');
        }
    };

    return (
        <div className="min-h-screen bg-background-level0 p-page-padding-block font-regular text-foreground-primary">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <header className="flex items-center justify-between pb-6 border-b border-border-secondary">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleBack}
                            className="p-2 -ml-2 text-foreground-tertiary hover:text-foreground-primary transition-colors"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-title2 font-bold flex items-center gap-2">
                                Admin CMS <Badge color="orange" variant="soft">Curator Mode</Badge>
                            </h1>
                            <div className="flex items-center gap-2 text-small text-foreground-tertiary">
                                <button
                                    onClick={() => { setView('course-select'); setSelectedCourse(null); }}
                                    className={`hover:underline ${view === 'course-select' ? 'font-bold text-accent-default' : 'hover:text-foreground-secondary'}`}
                                >
                                    1. Select Course
                                </button>
                                <span>&gt;</span>
                                <button
                                    onClick={() => selectedCourse && setView('course-dashboard')}
                                    disabled={!selectedCourse}
                                    className={`hover:underline disabled:no-underline disabled:opacity-50 ${view === 'course-dashboard' ? 'font-bold text-accent-default' : 'hover:text-foreground-secondary'}`}
                                >
                                    2. Dashboard
                                </button>
                                <span>&gt;</span>
                                <span className={view === 'lesson-editor' ? 'font-bold text-accent-default' : ''}>3. Lesson Editor</span>
                            </div>
                        </div>
                    </div>

                </header>

                <main className="min-h-[calc(100vh-200px)] pb-20">
                    {message && (
                        <div className={`mb-4 p-4 rounded-8 ${message.type === 'success' ? 'bg-semantic-green/10 text-semantic-green' : 'bg-semantic-red/10 text-semantic-red'}`}>
                            {message.text}
                        </div>
                    )}

                    {view === 'course-select' && <CourseSelectionView />}

                    {view === 'course-dashboard' && <CourseDashboardView />}

                    {view === 'lesson-editor' && (
                        <div className="grid lg:grid-cols-[1fr,1.5fr] gap-8 items-start">
                            {/* Left Panel: Unit List - Sticky */}
                            <div className="sticky top-6 h-[calc(100vh-100px)]">
                                <Card level="1" padding="large" className="bg-background-level1 flex flex-col h-full overflow-hidden">
                                    {step === 'input' ? (
                                        <div className="flex flex-col h-full space-y-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <h2 className="text-title3 font-bold">1. Import Content</h2>
                                                <Badge variant="soft" color="blue">JSON Mode</Badge>
                                            </div>

                                            <div className="flex-1 flex flex-col gap-2">
                                                <label className="text-small text-foreground-secondary">
                                                    Paste the generated JSON array here.
                                                </label>
                                                <TextArea
                                                    placeholder='[ { "original_text": "...", ... } ]'
                                                    className="flex-1 font-mono text-small leading-relaxed"
                                                    value={sourceJson}
                                                    onChange={e => setSourceJson(e.target.value)}
                                                />
                                            </div>

                                            <Button
                                                variant="primary"
                                                className="w-full"
                                                disabled={!sourceJson.trim()}
                                                onClick={handleJsonImport}
                                            >
                                                Import JSON
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col h-full space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h2 className="text-title3 font-bold">Learning Units</h2>
                                                <Button variant="ghost" size="small" onClick={() => setStep('input')}>New Input</Button>
                                            </div>
                                            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                                                {segments.map((seg, idx) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => setActiveSegmentIndex(idx)}
                                                        className={`
                                                            p-4 rounded-16 border cursor-pointer transition-all hover:border-accent-default
                                                            ${activeSegmentIndex === idx ? 'border-accent-default bg-accent-default/5 ring-1 ring-accent-default' : 'border-border-secondary bg-background-secondary'}
                                                        `}
                                                    >
                                                        <div className="flex justify-between items-center mb-2">
                                                            <Badge color={seg.status === 'saved' ? 'green' : seg.status === 'draft' ? 'blue' : 'gray'} variant="solid">
                                                                Unit {idx + 1}
                                                            </Badge>
                                                            {seg.status === 'saved' && <span className="text-mini text-semantic-green">Saved ✅</span>}
                                                        </div>
                                                        <p className="text-small font-serif text-foreground-secondary line-clamp-3">
                                                            {seg.text}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            </div>

                            {/* Right Panel: Editor - Fluid */}
                            <div className="min-h-full">
                                {step === 'managing' && activeSegmentIndex !== null && segments[activeSegmentIndex].data ? (
                                    <LessonEditor
                                        data={segments[activeSegmentIndex].data!}
                                        onSave={handleSave}
                                        onCancel={() => setActiveSegmentIndex(null)}
                                    />
                                ) : (
                                    <Card level="1" className="h-full flex items-center justify-center bg-background-level1 border-dashed border-2 border-border-secondary">
                                        {isLoading ? (
                                            <div className="text-center space-y-4">
                                                <div className="inline-block w-8 h-8 border-4 border-accent-default border-t-transparent rounded-full animate-spin" />
                                                <p className="text-foreground-secondary animate-pulse">AI Generating Content...</p>
                                            </div>
                                        ) : (
                                            <div className="text-center space-y-2">
                                                <p className="text-foreground-tertiary">Select a unit from the left to edit</p>
                                            </div>
                                        )}
                                    </Card>
                                )}
                            </div>
                        </div>
                    )}

                </main>
            </div>
        </div>
    );
}
