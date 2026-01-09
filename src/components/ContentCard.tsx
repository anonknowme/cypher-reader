import React from 'react';
import Link from 'next/link';
import { Badge } from './Badge';
import { Card } from './Card';

interface ContentCardProps {
    title: string;
    description: string;
    category: string;
    level: string;
    href?: string;
    thumbnailColor: string;
    imgUrl?: string; // New Optional Image URL
    disabled?: boolean;
}

export const ContentCard = ({
    title,
    description,
    category,
    level,
    href,
    thumbnailColor,
    imgUrl,
    disabled = false
}: ContentCardProps) => {
    // Layout 1: Immersive Image Card (Full Background)
    if (imgUrl) {
        const CardContent = (
            <Card
                level="2"
                padding="none"
                className={`
                    group relative overflow-hidden transition-all duration-300 h-full min-h-[320px] flex flex-col justify-end
                    ${disabled ? 'opacity-80' : 'hover:scale-[1.02] hover:shadow-high hover:border-accent-default/50'}
                `}
            >
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={imgUrl}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    {/* Gradient Overlay for Text Readability - Stronger at bottom */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background-level2 via-background-level2/90 to-transparent opacity-100" />
                </div>

                {/* Content Area (Overlaid) */}
                <div className="relative z-10 p-6 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                        <Badge variant="soft" color="accent" className="text-[10px] px-1.5 py-0.5 backdrop-blur-sm bg-accent-default/10">{category}</Badge>
                        <span className="text-small text-foreground-tertiary font-medium">{level}</span>
                    </div>

                    <h3 className={`text-title2 font-bold mb-2 leading-tight ${disabled ? 'text-foreground-secondary' : 'text-foreground-primary'}`}>
                        {title}
                    </h3>

                    <p className="text-large text-foreground-secondary line-clamp-2 mb-4 leading-relaxed">
                        {description}
                    </p>

                    {!disabled && (
                        <div className="flex items-center gap-2 text-accent-default font-bold text-small group-hover:translate-x-1 transition-transform mt-auto">
                            학습 시작하기
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                        </div>
                    )}
                </div>

                {disabled && (
                    <div className="absolute inset-0 bg-background-level0/60 backdrop-blur-[2px] flex items-center justify-center z-20">
                        <Badge color="gray" variant="solid">Coming Soon</Badge>
                    </div>
                )}
            </Card>
        );

        if (href && !disabled) return <Link href={href} className="block h-full">{CardContent}</Link>;
        return <div className="h-full cursor-not-allowed">{CardContent}</div>;
    }

    // Layout 2: Standard Gradient Card (Thumbnail + Content)
    const CardContent = (
        <Card
            level="2"
            padding="none"
            className={`
        group relative overflow-hidden transition-all duration-300 h-full flex flex-col
        ${disabled ? 'opacity-80' : 'hover:scale-[1.02] hover:shadow-high hover:border-accent-default/50'}
      `}
        >
            {/* Thumbnail Area */}
            <div className={`h-32 w-full ${thumbnailColor} relative flex items-center justify-center`}>
                <div className="absolute inset-0 bg-gradient-to-t from-background-level2 to-transparent opacity-60" />
                <span className="text-4xl filter drop-shadow-md transform group-hover:scale-110 transition-transform duration-300">
                    {category === 'Bitcoin' ? '₿' : '📚'}
                </span>

                {disabled && (
                    <div className="absolute inset-0 bg-background-level0/60 backdrop-blur-[2px] flex items-center justify-center">
                        <Badge color="gray" variant="solid">Coming Soon</Badge>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-3">
                    <Badge variant="soft" color="accent" className="text-[10px] px-1.5 py-0.5">{category}</Badge>
                    <span className="text-small text-foreground-tertiary font-medium">{level}</span>
                </div>

                <h3 className={`text-title3 font-bold mb-2 line-clamp-2 ${disabled ? 'text-foreground-secondary' : 'text-foreground-primary'}`}>
                    {title}
                </h3>

                <p className="text-small text-foreground-secondary line-clamp-3 mb-4 flex-1">
                    {description}
                </p>

                {!disabled && (
                    <div className="flex items-center gap-2 text-accent-default font-medium text-small group-hover:translate-x-1 transition-transform">
                        학습 시작하기
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </div>
                )}
            </div>
        </Card>
    );

    if (href && !disabled) {
        return <Link href={href} className="block h-full">{CardContent}</Link>;
    }

    return <div className="h-full cursor-not-allowed">{CardContent}</div>;
};
