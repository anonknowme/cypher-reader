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
        <Card level="1" padding="large" className="bg-background-level1 h-full flex flex-col overflow-hidden">
            {/* Header / Tabs */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-secondary">
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

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-6">

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
                            <div key={idx} className="flex gap-4 p-4 bg-background-secondary rounded-16 border border-border-primary items-end">
                                <div className="flex-1">
                                    <Input
                                        label="Word"
                                        value={vocab.word}
                                        onChange={(e) => {
                                            const newVocab = [...formData.vocabulary];
                                            newVocab[idx].word = e.target.value;
                                            updateField('vocabulary', newVocab);
                                        }}
                                    />
                                </div>
                                <div className="flex-[2]">
                                    <Input
                                        label="Definition"
                                        value={vocab.definition}
                                        onChange={(e) => {
                                            const newVocab = [...formData.vocabulary];
                                            newVocab[idx].definition = e.target.value;
                                            updateField('vocabulary', newVocab);
                                        }}
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    className="text-semantic-red hover:bg-semantic-red/10 h-10 w-10 p-0 flex items-center justify-center"
                                    onClick={() => {
                                        const newVocab = formData.vocabulary.filter((_, i) => i !== idx);
                                        updateField('vocabulary', newVocab);
                                    }}
                                >
                                    ✕
                                </Button>
                            </div>
                        ))}
                        <Button
                            variant="secondary"
                            className="w-full"
                            onClick={() => {
                                updateField('vocabulary', [...formData.vocabulary, { word: '', definition: '' }]);
                            }}
                        >
                            + Add Vocabulary
                        </Button>
                    </div>
                )}

                {/* 4. Quiz Tab */}
                {activeTab === 'quiz' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        <div className="p-4 bg-background-tertiary/20 rounded-16 border border-border-secondary">
                            <h4 className="font-bold text-small text-foreground-secondary mb-2">Review Quiz Output</h4>
                            <p className="font-serif text-large leading-relaxed text-foreground-primary">
                                {formData.quiz.segments.map((seg, i) => (
                                    <span key={i} className={seg.type === 'blank' ? 'text-accent-default font-bold underline decoration-dashed' : ''}>
                                        {seg.type === 'blank' ? `[${seg.content}]` : seg.content}
                                    </span>
                                ))}
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-small font-bold text-foreground-secondary">Correct Answers</label>
                                {formData.quiz.correctAnswers.map((ans, idx) => (
                                    <Input key={idx} value={ans} readOnly className="bg-semantic-green/5 border-semantic-green/30" />
                                ))}
                            </div>
                            <div className="space-y-3">
                                <label className="text-small font-bold text-foreground-secondary">Distractors (Wrong Options)</label>
                                {formData.quiz.distractors.map((dis, idx) => (
                                    <Input
                                        key={idx}
                                        value={dis}
                                        onChange={(e) => {
                                            const newDistractors = [...formData.quiz.distractors];
                                            newDistractors[idx] = e.target.value;
                                            setFormData(prev => ({
                                                ...prev,
                                                quiz: { ...prev.quiz, distractors: newDistractors }
                                            }));
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </Card>
    );
}
