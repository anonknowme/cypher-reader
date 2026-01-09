import React from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    helperText?: string;
    fullWidth?: boolean;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
    ({ label, error, helperText, fullWidth = false, className = '', ...props }, ref) => {
        return (
            <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''}`}>
                {label && (
                    <label className="text-small font-medium text-foreground-secondary">
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    className={`
            min-h-[120px] px-3 py-3 rounded-12
            bg-background-secondary border border-border-secondary
            text-regular text-foreground-primary leading-relaxed
            placeholder:text-foreground-quaternary
            focus:outline-none focus:ring-2 focus:ring-accent-default/50 focus:border-accent-default
            disabled:opacity-50 disabled:cursor-not-allowed
            resize-y
            transition-all duration-quick ease-in-out-cubic
            ${error ? 'border-semantic-red focus:ring-semantic-red/50 focus:border-semantic-red' : ''}
            ${className}
          `}
                    {...props}
                />
                {(error || helperText) && (
                    <span className={`text-micro ${error ? 'text-semantic-red' : 'text-foreground-tertiary'}`}>
                        {error || helperText}
                    </span>
                )}
            </div>
        );
    }
);

TextArea.displayName = 'TextArea';
