import React from 'react';

interface TypingFeedbackProps {
    original: string;
    input: string;
    className?: string;
    isBlankMode?: boolean; // For Level 2 (Blank Fill)
}

export const TypingFeedback = ({ original, input, className = '', isBlankMode = false }: TypingFeedbackProps) => {
    // Simple character-by-character diff visualization
    return (
        <div className={`text-large font-serif leading-relaxed ${className}`}>
            {original.split('').map((char, index) => {
                const inputChar = input[index];
                let colorClass = 'text-foreground-tertiary'; // Default (not typed yet)

                if (inputChar !== undefined) {
                    if (inputChar.toLowerCase() === char.toLowerCase()) {
                        colorClass = 'text-semantic-green font-medium'; // Correct
                    } else {
                        colorClass = 'text-semantic-red bg-semantic-red/10'; // Typo
                    }
                }

                return (
                    <span key={index} className={`transition-colors duration-100 ${colorClass}`}>
                        {char}
                    </span>
                );
            })}
        </div>
    );
};
