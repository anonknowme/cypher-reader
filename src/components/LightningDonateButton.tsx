'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { LIGHTNING_ADDRESS, DONATION_MESSAGE, WALLETS } from '@/lib/lightningConfig';
import { Button } from './Button';
import { Card } from './Card';
import { Badge } from './Badge';

interface LightningDonateButtonProps {
    variant?: 'icon' | 'button';
    message?: string;
}

export const LightningDonateButton = ({
    variant = 'button',
    message = DONATION_MESSAGE
}: LightningDonateButtonProps) => {
    const [showModal, setShowModal] = useState(false);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (showModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [showModal]);

    const openWallet = (scheme: string) => {
        const lightningUrl = `${scheme}lightning:${LIGHTNING_ADDRESS}`;
        window.location.href = lightningUrl;
    };

    return (
        <>
            {variant === 'icon' ? (
                <button
                    onClick={() => setShowModal(true)}
                    className="w-12 h-12 rounded-full flex items-center justify-center text-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg hover:scale-110 active:scale-95 transition-all duration-300"
                    title="비트코인 후원하기"
                >
                    ⚡
                </button>
            ) : (
                <Button
                    onClick={() => setShowModal(true)}
                    variant="primary"
                    className="!bg-gradient-to-br !from-orange-400 !to-orange-600 !border-none !text-white shadow-lg shadow-orange-500/20 hover:!shadow-orange-500/40 hover:-translate-y-0.5"
                >
                    <span className="mr-2 text-lg">⚡</span>
                    후원하기
                </Button>
            )}

            {/* Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-level0/80 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="w-full max-w-sm max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Card level="2" padding="large" className="relative shadow-2xl border-orange-500/20">
                            {/* Close Button */}
                            <button
                                onClick={() => setShowModal(false)}
                                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-background-tertiary text-foreground-secondary hover:bg-background-level0 hover:text-foreground-primary transition-colors"
                            >
                                ✕
                            </button>

                            <div className="text-center space-y-6">
                                <div className="space-y-2">
                                    <Badge color="orange" variant="soft" className="mb-2">Lightning Donation</Badge>
                                    <h2 className="text-title2 font-bold text-foreground-primary">
                                        ⚡ 후원하기
                                    </h2>
                                    <p className="text-small text-foreground-secondary leading-relaxed break-keep">
                                        {message}
                                    </p>
                                </div>

                                {/* Wallet Buttons */}
                                <div className="space-y-3">
                                    {WALLETS.map((wallet) => (
                                        <button
                                            key={wallet.name}
                                            onClick={() => openWallet(wallet.scheme)}
                                            className="w-full flex items-center gap-3 p-4 rounded-xl bg-background-secondary border border-transparent hover:border-orange-500/30 hover:bg-orange-500/5 transition-all group"
                                        >
                                            <span className="text-2xl group-hover:scale-110 transition-transform duration-200">{wallet.icon}</span>
                                            <span className="font-bold text-foreground-primary">{wallet.name}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* QR Code Section */}
                                <div className="pt-6 border-t border-border-dashed">
                                    <p className="text-mini text-foreground-tertiary mb-4">
                                        또는 QR 코드로 스캔하세요
                                    </p>
                                    <div className="bg-white p-4 rounded-xl inline-block shadow-sm">
                                        <QRCodeSVG
                                            value={`lightning:${LIGHTNING_ADDRESS}`}
                                            size={160}
                                            level="H"
                                            includeMargin={false}
                                        />
                                    </div>

                                    <div className="mt-4 p-3 bg-background-tertiary rounded-lg break-all">
                                        <p className="text-mini text-foreground-tertiary mb-1">Lightning Address</p>
                                        <p className="text-small font-mono font-bold text-foreground-primary select-all">
                                            {LIGHTNING_ADDRESS}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </>
    );
};
