import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    level?: '0' | '1' | '2' | '3';
    padding?: 'none' | 'small' | 'medium' | 'large';
    bordered?: boolean;
}

const levelStyles = {
    '0': 'bg-background-level0',
    '1': 'bg-background-level1',
    '2': 'bg-background-level2',
    '3': 'bg-background-level3',
};

const paddingStyles = {
    none: '',
    small: 'p-4',
    medium: 'p-6',
    large: 'p-8',
};

export const Card = ({
    children,
    level = '1',
    padding = 'medium',
    bordered = true,
    className = '',
    ...props
}: CardProps) => {
    return (
        <div
            className={`
        rounded-24
        ${levelStyles[level]}
        ${paddingStyles[padding]}
        ${bordered ? 'border border-border-primary' : ''}
        shadow-low
        ${className}
      `}
            {...props}
        >
            {children}
        </div>
    );
};
