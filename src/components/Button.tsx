import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
}

export const Button = ({
    children,
    variant = 'primary',
    size = 'medium',
    fullWidth = false,
    className = '',
    ...props
}: ButtonProps) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-8 font-medium transition-all duration-quick ease-in-out-cubic active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-default/50 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

    const variants = {
        primary: 'bg-accent-default text-white hover:bg-accent-hover shadow-low hover:shadow-medium border border-transparent',
        secondary: 'bg-background-secondary text-foreground-primary border border-border-secondary hover:bg-background-tertiary hover:border-border-tertiary',
        ghost: 'bg-transparent text-foreground-secondary hover:text-foreground-primary hover:bg-background-tertiary',
        danger: 'bg-semantic-red/10 text-semantic-red border border-semantic-red/20 hover:bg-semantic-red/20',
    };

    const sizes = {
        small: 'text-small px-3 py-1.5 h-8',
        medium: 'text-regular px-4 py-2 h-10',
        large: 'text-large px-6 py-3 h-12',
    };

    return (
        <button
            className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
            {...props}
        >
            {children}
        </button>
    );
};
