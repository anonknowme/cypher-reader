'use client';

import React, { useState } from 'react';

interface WordWithDefinitionProps {
    word: string;
    def: string;
    showAlways?: boolean;
    level?: string | null;
}

export function WordWithDefinition({ word, def, showAlways = false, level }: WordWithDefinitionProps) {
    const [isOpen, setIsOpen] = useState(false);
    const isVisible = showAlways || isOpen;

    // Level-based Colors
    // Default is Orange (Accent)
    let textColor = 'text-orange-600';
    let bgColor = 'bg-orange-500/5';
    let hoverBgColor = 'hover:bg-foreground-primary/5';
    let borderColor = 'border-orange-500';
    let borderColorFaded = 'border-orange-500/40';

    if (level) {
        const normalized = level.toUpperCase();
        if (normalized === 'BEGINNER') {
            textColor = 'text-green-600';
            bgColor = 'bg-green-500/10';
            borderColor = 'border-green-500';
            borderColorFaded = 'border-green-500/40';
        } else if (normalized === 'INTERMEDIATE') {
            textColor = 'text-blue-600';
            bgColor = 'bg-blue-500/10';
            borderColor = 'border-blue-500';
            borderColorFaded = 'border-blue-500/40';
        } else if (normalized === 'BITCOIN_TERM') {
            textColor = 'text-accent-default';
            bgColor = 'bg-accent-default/10';
            borderColor = 'border-accent-default';
            borderColorFaded = 'border-accent-default/40';
        }
    }

    return (
        <span
            className="inline-block align-baseline mx-0.5 cursor-pointer select-none group focus:outline-none"
            onClick={(e) => {
                e.preventDefault();
                setIsOpen(!isOpen);
            }}
            role="button"
            tabIndex={0}
        >
            {/* Definition */}
            <span className={`
                block w-max max-w-[200px] mx-auto mb-0.5
                text-[0.6em] font-medium text-center leading-tight whitespace-normal
                transition-all duration-200 ease-out
                ${textColor}
                ${isVisible
                    ? 'opacity-100 max-h-[200px] py-0.5'
                    : 'opacity-0 max-h-0 overflow-hidden py-0'}
            `}>
                {def}
            </span>

            {/* Word */}
            <span className={`
                block text-center leading-none px-0.5 rounded-sm
                transition-all duration-200
                ${isVisible
                    ? `${textColor} font-medium ${bgColor}`
                    : `text-foreground-primary ${hoverBgColor}`}
                border-b border-dashed 
                ${isVisible ? borderColor : `${borderColorFaded} group-hover:${borderColor}`}
            `}>
                {word}
            </span>
        </span>
    );
}
