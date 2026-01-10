'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface DonationPromptContextType {
    isPromptVisible: boolean;
    triggerPrompt: () => void;
    dismissPrompt: () => void;
}

const DonationPromptContext = createContext<DonationPromptContextType | null>(null);

export function DonationPromptProvider({ children }: { children: React.ReactNode }) {
    const [isPromptVisible, setIsPromptVisible] = useState(false);

    useEffect(() => {
        // Check first visit
        const hasSeen = localStorage.getItem('cr_has_seen_donation_prompt');
        if (!hasSeen) {
            // Show prompt on first visit after a short delay
            const timer = setTimeout(() => {
                triggerPrompt();
            }, 3000); // 3 seconds delay for politeness
            return () => clearTimeout(timer);
        }
    }, []);

    const triggerPrompt = () => {
        setIsPromptVisible(true);
        localStorage.setItem('cr_has_seen_donation_prompt', 'true');

        // Auto-hide after 10 seconds? Or keep it until dismissed?
        // User asked for "popup-like", so auto-hide might be better to not annoy.
        // Let's keep it persistent until clicked or dismissed for now, as it points to the button.
        // Actually, let's auto-hide after 8 seconds to be non-intrusive.
        setTimeout(() => {
            setIsPromptVisible(false);
        }, 8000);
    };

    const dismissPrompt = () => {
        setIsPromptVisible(false);
    };

    return (
        <DonationPromptContext.Provider value={{ isPromptVisible, triggerPrompt, dismissPrompt }}>
            {children}
        </DonationPromptContext.Provider>
    );
}

export function useDonationPrompt() {
    const context = useContext(DonationPromptContext);
    if (!context) {
        throw new Error('useDonationPrompt must be used within a DonationPromptProvider');
    }
    return context;
}
