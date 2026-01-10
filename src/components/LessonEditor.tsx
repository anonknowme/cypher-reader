'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Input } from '@/components/Input';
import { TextArea } from '@/components/TextArea';
import { LessonData } from '@/actions/lesson-actions';

interface LessonEditorProps {
    data: LessonData;
    onSave: (updatedData: LessonData) => void;
    onCancel: () => void;
}

export function LessonEditor({ data, onSave, onCancel }: LessonEditorProps) {
    const [formData, setFormData] = useState<LessonData>(data);
    const [activeTab, setActiveTab] = useState<'info' | 'chunks' | 'vocab' | 'quiz'>('info');

    // Update form when prop changes
    useEffect(() => {
        setFormData(data);
    }, [data]);

    const updateField = (field: keyof LessonData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const updateChunk = (index: number, field: 'en' | 'kr', value: string) => {
        const newChunks = [...formData.chunks];
        newChunks[index] = { ...newChunks[index], [field]: value };
        updateField('chunks', newChunks);
    };

    return (
        <Card level="1" padding="large" className="bg-background-level1 flex flex-col relative h-auto min-h-full">
            {/* Header / Tabs - Sticky */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-secondary sticky top-0 bg-background-level1 z-10 pt-2 -mt-2">
                <div className="flex gap-2">
                    {['info', 'chunks', 'vocab', 'quiz'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-2 rounded-full text-small font-medium transition-colors ${activeTab === tab
                                ? 'bg-accent-default text-white'
                                : 'bg-background-tertiary text-foreground-secondary hover:bg-background-quaternary'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                    <Button variant="primary" onClick={() => onSave(formData)}>저장하기</Button>
                </div>
            </div>

            {/* Content - Fluid Height */}
            <div className="space-y-6">

                {/* 1. Basic Info Tab */}
                {activeTab === 'info' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        <div className="space-y-2">
                            <label className="text-small font-bold text-foreground-secondary">English Original</label>
                            <TextArea
                                value={formData.original_text}
                                onChange={(e) => updateField('original_text', e.target.value)}
                                className="font-serif text-large"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-small font-bold text-foreground-secondary">Korean Translation</label>
                            <TextArea
                                value={formData.translation_kr}
                                onChange={(e) => updateField('translation_kr', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-small font-bold text-foreground-secondary">Context Description</label>
                            <TextArea
                                value={formData.context_desc}
                                onChange={(e) => updateField('context_desc', e.target.value)}
                                className="h-24"
                            />
                        </div>
                    </div>
                )}

                {/* 2. Chunks Tab */}
                {activeTab === 'chunks' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        {formData.chunks.map((chunk, idx) => (
                            <div key={idx} className="p-4 bg-background-secondary rounded-16 border border-border-primary space-y-3">
                                <div className="flex justify-between items-center">
                                    <Badge variant="outline" color="gray">Chunk {idx + 1}</Badge>
                                </div>
                                <div className="grid gap-3">
                                    <Input
                                        label="English Phrase"
                                        value={chunk.en}
                                        onChange={(e) => updateChunk(idx, 'en', e.target.value)}
                                    />
                                    <Input
                                        label="Korean Meaning"
                                        value={chunk.kr}
                                        onChange={(e) => updateChunk(idx, 'kr', e.target.value)}
                                    />
                                </div>
                                <div className="flex justify-end pt-2">
                                    <Button
                                        variant="ghost"
                                        size="small"
                                        onClick={() => {
                                            const newChunks = [...formData.chunks];
                                            newChunks.splice(idx + 1, 0, { en: "", kr: "" });
                                            updateField('chunks', newChunks);
                                        }}
                                        className="text-accent-default hover:bg-accent-default/10"
                                    >
                                        + Insert Chunk Below
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="small"
                                        onClick={() => {
                                            const newChunks = formData.chunks.filter((_, i) => i !== idx);
                                            updateField('chunks', newChunks);
                                        }}
                                        className="text-semantic-red hover:bg-semantic-red/10"
                                    >
                                        Delete Chunk
                                    </Button>
                                </div>
                            </div>
                        ))}
                        <Button
                            variant="secondary"
                            className="w-full mt-4"
                            onClick={() => {
                                updateField('chunks', [...formData.chunks, { en: '', kr: '' }]);
                            }}
                        >
                            + Add Chunk at End
                        </Button>
                    </div>
                )}

                {/* 3. Vocab Tab */}
                {activeTab === 'vocab' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        {formData.vocabulary.map((vocab, idx) => (
                            <div key={idx} className="flex flex-col gap-4 p-4 bg-background-secondary rounded-16 border border-border-primary">
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <Input
                                            label="Word (Text)"
                                            value={vocab.word}
                                            onChange={(e) => {
                                                const newVocab = [...formData.vocabulary];
                                                newVocab[idx].word = e.target.value;
                                                updateField('vocabulary', newVocab);
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <Input
                                            label="Lemma (Base Form)"
                                            placeholder={vocab.word.toLowerCase()}
                                            value={vocab.lemma || ''}
                                            onChange={(e) => {
                                                const newVocab = [...formData.vocabulary];
                                                newVocab[idx].lemma = e.target.value;
                                                updateField('vocabulary', newVocab);
                                            }}
                                            className="font-mono text-accent-default"
                                        />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        className="text-semantic-red hover:bg-semantic-red/10 h-10 w-10 p-0 flex items-center justify-center self-end mb-1"
                                        onClick={() => {
                                            const newVocab = formData.vocabulary.filter((_, i) => i !== idx);
                                            updateField('vocabulary', newVocab);
                                        }}
                                    >
                                        ✕
                                    </Button>
                                </div>
                                <div className="w-full">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-small font-bold text-foreground-secondary">
                                            Definition (Global)
                                        </label>
                                        <span className="text-mini text-semantic-orange flex items-center gap-1">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                                <line x1="12" y1="9" x2="12" y2="13" />
                                                <line x1="12" y1="17" x2="12.01" y2="17" />
                                            </svg>
                                            Editing this updates all lessons
                                        </span>
                                    </div>
                                    <Input
                                        value={vocab.definition}
                                        onChange={(e) => {
                                            const newVocab = [...formData.vocabulary];
                                            newVocab[idx].definition = e.target.value;
                                            updateField('vocabulary', newVocab);
                                        }}
                                        className="border-semantic-orange/30 focus:border-semantic-orange"
                                    />
                                </div>
                            </div>
                        ))}
                        <Button
                            variant="secondary"
                            className="w-full"
                            onClick={() => {
                                updateField('vocabulary', [...formData.vocabulary, { word: '', lemma: '', definition: '' }]);
                            }}
                        >
                            + Add Vocabulary
                        </Button>
                    </div>
                )}

                {/* 4. Quiz Tab */}
                {activeTab === 'quiz' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                        {/* Normalize quizzes/quiz into a list */}
                        {(formData.quizzes || (formData.quiz ? [formData.quiz] : [])).map((quizItem, qIdx) => (
                            <div key={qIdx} className="p-4 bg-background-secondary rounded-16 border border-border-primary space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-foreground-primary">Quiz #{qIdx + 1}</h4>
                                    <Button
                                        variant="ghost"
                                        size="small"
                                        className="text-semantic-red hover:bg-semantic-red/10"
                                        onClick={() => {
                                            const currentList = formData.quizzes || (formData.quiz ? [formData.quiz] : []);
                                            const newList = currentList.filter((_, i) => i !== qIdx);
                                            updateField('quizzes', newList);
                                        }}
                                    >
                                        Remove
                                    </Button>
                                </div>

                                <div className="p-4 bg-background-tertiary/20 rounded-8 border border-border-secondary">
                                    <p className="font-serif text-large leading-relaxed text-foreground-primary">
                                        {quizItem.segments.map((seg, i) => (
                                            <span key={i} className={seg.type === 'blank' ? 'text-accent-default font-bold underline decoration-dashed' : ''}>
                                                {seg.type === 'blank' ? `[${seg.content}]` : seg.content}
                                            </span>
                                        ))}
                                    </p>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-small font-bold text-foreground-secondary">Correct Answers</label>
                                        {quizItem.correctAnswers.map((ans, idx) => (
                                            <Input key={idx} value={ans} readOnly className="bg-semantic-green/5 border-semantic-green/30" />
                                        ))}
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-small font-bold text-foreground-secondary">Distractors</label>
                                        {quizItem.distractors.map((dis, idx) => (
                                            <Input
                                                key={idx}
                                                value={dis}
                                                onChange={(e) => {
                                                    const currentList = [...(formData.quizzes || (formData.quiz ? [formData.quiz] : []))];
                                                    const newDistractors = [...currentList[qIdx].distractors];
                                                    newDistractors[idx] = e.target.value;
                                                    currentList[qIdx] = { ...currentList[qIdx], distractors: newDistractors };
                                                    updateField('quizzes', currentList);
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="flex justify-center p-8 border-2 border-dashed border-border-secondary rounded-16 text-foreground-tertiary">
                            To add a new quiz, please use the AI generation again or implement manual quiz creation (Coming Soon).
                        </div>
                    </div>
                )}

            </div>
        </Card>
    );
}
