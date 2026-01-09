'use client';

import React, { useState } from 'react';

interface WordWithDefinitionProps {
    word: string;
    def: string;
    showAlways?: boolean;
}

export function WordWithDefinition({ word, def, showAlways = false }: WordWithDefinitionProps) {
    const [isOpen, setIsOpen] = useState(false);
    // If "Show All Meanings" is on (showAlways), we show the definition.
    // Otherwise, we show it on click (isOpen).
    const isVisible = showAlways || isOpen;

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
            {/* Definition - Top (Flows in same block) */}
            {/* We render this BEFORE the word so it sits on top in the block flow. */}
            <span className={`
                block w-max max-w-[200px] mx-auto mb-0.5
                text-[0.6em] font-medium text-accent-default text-center leading-tight whitespace-normal
                transition-all duration-200 ease-out
                ${isVisible
                    ? 'opacity-100 max-h-[200px] py-0.5'
                    : 'opacity-0 max-h-0 overflow-hidden py-0'}
            `}>
                {def}
            </span>

            {/* The Word - Bottom (Last line determines baseline) */}
            <span className={`
                block text-center leading-none px-0.5 rounded-sm
                transition-all duration-200
                ${isVisible
                    ? 'text-accent-default font-medium bg-accent-default/5'
                    : 'text-foreground-primary hover:bg-foreground-primary/5'}
                border-b border-dashed 
                ${isVisible ? 'border-accent-default' : 'border-accent-default/40 group-hover:border-accent-default'}
            `}>
                {word}
            </span>
        </span>
    );
}
