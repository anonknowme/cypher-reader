'use client';

import React, { useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { TextArea } from '@/components/TextArea';
import { CourseDataV3, SectionDataV3, deleteCourseV3 } from '@/actions/course-actions-v3';
import { Message, ConfirmDialog } from './types';

export interface CourseSelectionViewProps {
    courses: CourseDataV3[];
    selectedCourse: CourseDataV3 | null;
    sections: SectionDataV3[];
    isLoading: boolean;
    handleCreateCourse: (title: string, id: string, desc: string, imgUrl: string) => Promise<void>;
    handleSelectCourse: (course: CourseDataV3) => Promise<void>;
    loadCourses: () => Promise<void>;
    setMessage: (msg: Message | null) => void;
    setIsLoading: (loading: boolean) => void;
}

export const CourseSelectionView = ({
    courses,
    selectedCourse,
    sections,
    isLoading,
    handleCreateCourse,
    handleSelectCourse,
    loadCourses,
    setMessage,
    setIsLoading,
}: CourseSelectionViewProps) => {
    const [newTitle, setNewTitle] = useState('');
    const [newId, setNewId] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newImgUrl, setNewImgUrl] = useState('');
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);


    if (selectedCourse) return null; // Hide if selected

    return (
        <div className="grid md:grid-cols-2 gap-8">
            <Card level="1" padding="large" className="space-y-4 h-fit">
                <h2 className="text-title3 font-bold">Existing Courses (V3)</h2>
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
                                                        await deleteCourseV3(c.id);
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
                        <p className="text-foreground-tertiary">No courses found.</p>
                    )}
                    {isLoading && courses.length === 0 && (
                        <p className="text-foreground-tertiary animate-pulse">Loading...</p>
                    )}
                </div>
            </Card>

            <Card level="1" padding="large" className="space-y-4 h-fit sticky top-6">
                <h2 className="text-title3 font-bold">Create New Course</h2>
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
                        Create Course
                    </Button>
                </div>
            </Card>

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
