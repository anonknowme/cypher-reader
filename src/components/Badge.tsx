import React from 'react';

type BadgeVariant = 'solid' | 'soft' | 'outline';
type BadgeColor = 'accent' | 'blue' | 'green' | 'red' | 'orange' | 'yellow' | 'gray';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
    color?: BadgeColor;
    className?: string;
}

const variantStyles: Record<BadgeVariant, Record<BadgeColor, string>> = {
    solid: {
        accent: 'bg-accent-default text-white border-transparent',
        blue: 'bg-semantic-blue text-white border-transparent',
        green: 'bg-semantic-green text-white border-transparent',
        red: 'bg-semantic-red text-white border-transparent',
        orange: 'bg-semantic-orange text-white border-transparent',
        yellow: 'bg-semantic-yellow text-black border-transparent',
        gray: 'bg-background-tertiary text-foreground-primary border-transparent',
    },
    soft: {
        accent: 'bg-accent-default/15 text-accent-default border-transparent',
        blue: 'bg-semantic-blue/15 text-semantic-blue border-transparent',
        green: 'bg-semantic-green/15 text-semantic-green border-transparent',
        red: 'bg-semantic-red/15 text-semantic-red border-transparent',
        orange: 'bg-semantic-orange/15 text-semantic-orange border-transparent',
        yellow: 'bg-semantic-yellow/15 text-semantic-yellow border-transparent',
        gray: 'bg-background-tertiary/50 text-foreground-secondary border-transparent',
    },
    outline: {
        accent: 'bg-transparent text-accent-default border-accent-default/30',
        blue: 'bg-transparent text-semantic-blue border-semantic-blue/30',
        green: 'bg-transparent text-semantic-green border-semantic-green/30',
        red: 'bg-transparent text-semantic-red border-semantic-red/30',
        orange: 'bg-transparent text-semantic-orange border-semantic-orange/30',
        yellow: 'bg-transparent text-semantic-yellow border-semantic-yellow/30',
        gray: 'bg-transparent text-foreground-secondary border-border-secondary',
    }
};

export const Badge = ({
    children,
    variant = 'soft',
    color = 'accent',
    className = '',
    ...props
}: BadgeProps) => {
    return (
        <span
            className={`
        inline-flex items-center justify-center
        px-2.5 py-0.5
        text-mini font-medium rounded-full
        border
        ${variantStyles[variant][color]}
        ${className}
      `}
            {...props}
        >
            {children}
        </span>
    );
};
