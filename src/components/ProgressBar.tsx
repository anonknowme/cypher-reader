import React from 'react';

interface ProgressBarProps {
    currentStep: number;
    totalSteps: number;
    onStepClick?: (step: number) => void;
    className?: string;
}

export const ProgressBar = ({ currentStep, totalSteps, onStepClick, className = '' }: ProgressBarProps) => {
    return (
        <div className={`flex gap-2 w-full ${className}`}>
            {Array.from({ length: totalSteps }, (_, i) => {
                const step = i + 1;
                const isActive = step <= currentStep;
                const isCurrent = step === currentStep;

                return (
                    <div
                        key={step}
                        onClick={() => onStepClick && onStepClick(step)}
                        className={`
              h-2 rounded-full flex-1 transition-all duration-300 ease-out-expo
              ${onStepClick ? 'cursor-pointer hover:opacity-80' : ''}
              ${isActive ? 'bg-accent-default' : 'bg-background-tertiary'}
              ${isCurrent ? 'shadow-low' : ''}
            `}
                    />
                );
            })}
        </div>
    );
};
