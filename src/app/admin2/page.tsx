'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { TextArea } from '@/components/TextArea';
import {
    getAllCoursesV3,
    createCourseV3,
    getSectionsV3,
    createSectionV3,
    getLessonSummariesV3,
    getAllLessonsV3,
    createLessonV3,
    updateLessonV3,
    getLessonV3,
    deleteCourseV3,
    deleteSectionV3,
    deleteLessonV3,
    deleteAllLessonsInSectionV3,
    mergeLessonsV3,
    migrateV2toV3,
    CourseDataV3,
    SectionDataV3,
    LessonDataV3,
    LessonWithChildren
} from '@/actions/course-actions-v3';

import { EditorView } from './_components/EditorView';
import { CourseSelectionView } from './_components/CourseSelectionView';
import { CourseDashboardView } from './_components/CourseDashboardView';


export default function AdminPage2() {
    // Top Level State
    const [courses, setCourses] = useState<CourseDataV3[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isUnsavedChanges, setUnsavedChanges] = useState(false);

    const handleNavigateBack = () => {
        if (isUnsavedChanges) {
            setConfirmDialog({
                isOpen: true,
                title: 'Unsaved Changes',
                message: 'You have unsaved changes. Discard them?',
                onConfirm: () => {
                    setSelectedCourse(null);
                    setSelectedSection(null);
                    setActiveLesson(null);
                    setUnsavedChanges(false);
                    setConfirmDialog(null);
                }
            });
            return;
        }
        setSelectedCourse(null);
        setSelectedSection(null);
        setActiveLesson(null);
        setUnsavedChanges(false);
    };

    const handleCloseLesson = () => {
        if (isUnsavedChanges) {
            setConfirmDialog({
                isOpen: true,
                title: 'Unsaved Changes',
                message: 'You have unsaved changes. Discard them?',
                onConfirm: () => {
                    setActiveLesson(null);
                    setUnsavedChanges(false);
                    setConfirmDialog(null);
                }
            });
            return;
        }
        setActiveLesson(null);
        setUnsavedChanges(false);
    };
    // Lifted State for Editor (Prevents reset on re-render)
    const [editMode, setEditMode] = useState<'structure' | 'vocab'>('structure');

    // Selected Course State (Step 2)
    const [selectedCourse, setSelectedCourse] = useState<CourseDataV3 | null>(null);

    // Define extended type locally or use from V3 if exported
    type LessonWithContent = LessonWithChildren;

    const [sections, setSections] = useState<SectionDataV3[]>([]); // Sections in selected course
    const [selectedSection, setSelectedSection] = useState<SectionDataV3 | null>(null); // Selected section
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
            const list = await getAllCoursesV3();
            setCourses(list);

            // Load all sections for all courses to display counts
            const allSections = await Promise.all(
                list.map(course => getSectionsV3(course.id))
            );
            setSections(allSections.flat());
        } catch (e) {
            console.error("Failed to load courses", e);
            setMessage({ type: 'error', text: 'Failed to load courses' });
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
            await createCourseV3(newCourse);
            await loadCourses();
            setMessage({ type: 'success', text: 'Course created successfully.' });
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to create course. ID might be duplicate.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectCourse = async (course: CourseDataV3) => {
        setSelectedCourse(course);
        setSelectedSection(null); // Reset section selection
        setActiveLesson(null); // Reset active lesson
        setLessons([]); // Clear selected section lessons
        setIsLoading(true);
        try {
            const courseSections = await getSectionsV3(course.id);
            setSections(courseSections);

            // Load all lessons for badge counts
            const allCourseLessons = await getAllLessonsV3(course.id);
            setAllLessons(allCourseLessons);
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to load sections' });
        } finally {
            setIsLoading(false);
        }
    };


    const handleSelectSection = async (section: SectionDataV3) => {
        setSelectedSection(section);
        setIsLoading(true);
        try {
            const sectionLessons = await getLessonSummariesV3(section.id);
            setLessons(sectionLessons);
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to load lessons' });
        } finally {
            setIsLoading(false);
        }
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
                            <Button variant="ghost" size="small" onClick={handleNavigateBack}>
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

                    <CourseSelectionView
                        courses={courses}
                        selectedCourse={selectedCourse}
                        sections={sections}
                        isLoading={isLoading}
                        handleCreateCourse={handleCreateCourse}
                        handleSelectCourse={handleSelectCourse}
                        loadCourses={loadCourses}
                        setMessage={setMessage}
                        setIsLoading={setIsLoading}
                    />
                    <CourseDashboardView
                        selectedCourse={selectedCourse}
                        activeLesson={activeLesson}
                        selectedSection={selectedSection}
                        sections={sections}
                        allLessons={allLessons}
                        lessons={lessons}
                        handleSelectCourse={handleSelectCourse}
                        handleSelectSection={handleSelectSection}
                        createSectionV3={createSectionV3}
                        getLessonSummariesV3={getLessonSummariesV3}
                        getLessonV3={getLessonV3}
                        createLessonV3={createLessonV3}
                        updateLessonV3={updateLessonV3}
                        deleteSectionV3={deleteSectionV3}
                        deleteLessonV3={deleteLessonV3}
                        deleteAllLessonsInSectionV3={deleteAllLessonsInSectionV3}
                        mergeLessonsV3={mergeLessonsV3}
                        setActiveLesson={setActiveLesson}
                        setLessons={setLessons}
                        setSelectedSection={setSelectedSection}
                        setIsLoading={setIsLoading}
                        setMessage={setMessage}
                    />
                    {activeLesson && (
                        <EditorView
                            activeLesson={activeLesson}
                            setActiveLesson={setActiveLesson}
                            editMode={editMode}
                            setEditMode={setEditMode}
                            message={message}
                            setMessage={setMessage}
                            setIsLoading={setIsLoading}
                            setUnsavedChanges={setUnsavedChanges}
                            onClose={handleCloseLesson}
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
