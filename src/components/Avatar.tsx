'use client';

import React from 'react';

type AvatarSize = 'small' | 'medium' | 'large' | 'xlarge';

interface AvatarProps {
    src?: string;
    alt?: string;
    initials?: string;
    size?: AvatarSize;
    className?: string;
}

const sizeStyles: Record<AvatarSize, string> = {
    small: 'w-8 h-8 text-micro',
    medium: 'w-10 h-10 text-mini',
    large: 'w-12 h-12 text-small',
    xlarge: 'w-16 h-16 text-regular',
};

export const Avatar = ({
    src,
    alt = 'Avatar',
    initials,
    size = 'medium',
    className = '',
}: AvatarProps) => {
    const [imageError, setImageError] = React.useState(false);

    return (
        <div
            className={`
        relative inline-flex items-center justify-center
        rounded-circle overflow-hidden
        bg-background-tertiary border border-border-secondary
        text-foreground-secondary font-medium
        ${sizeStyles[size]}
        ${className}
      `}
        >
            {src && !imageError ? (
                <img
                    src={src}
                    alt={alt}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                />
            ) : (
                <span>{initials || '?'}</span>
            )}
        </div>
    );
};
