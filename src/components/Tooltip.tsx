'use client';

import React, { useState, useEffect, useRef } from 'react';

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

export const Tooltip = ({ content, children, className = '' }: TooltipProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const tooltipRef = useRef<HTMLSpanElement>(null);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
                setIsVisible(false);
            }
        };

        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isVisible]);

    return (
        <span
            ref={tooltipRef}
            className={`relative inline-block cursor-pointer transition-colors duration-200 rounded-4 px-0.5 -mx-0.5 ${className} ${isVisible ? 'bg-accent-default/20 text-accent-default' : ''}`}
            onClick={(e) => {
                e.stopPropagation(); // Prevent immediate closing
                setIsVisible(!isVisible);
            }}
        >
            <span className={`border-b border-dashed decoration-skip-ink ${isVisible ? 'border-transparent' : 'border-accent-default/50'}`}>
                {children}
            </span>

            {isVisible && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[240px] z-50 animate-in fade-in zoom-in-95 duration-quick">
                    <div className="bg-background-level3 border border-border-primary text-foreground-primary text-regular px-4 py-3 rounded-12 shadow-high">
                        {content}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-8 border-transparent border-t-background-level3 border-t-border-primary w-0 h-0" />
                    </div>
                </div>
            )}
        </span>
    );
};
