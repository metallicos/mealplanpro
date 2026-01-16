'use client';

import { useState, useEffect } from 'react';
import { X, Crown, Sparkles, Check, CreditCard, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    feature?: 'coach' | 'smart_plan';
    trialDaysRemaining?: number;
}

export default function UpgradeModal({ isOpen, onClose, feature, trialDaysRemaining }: UpgradeModalProps) {
    const t = useTranslations('subscription');
    const [loading, setLoading] = useState(false);
    const [availableGateways, setAvailableGateways] = useState<string[]>([]);
    const [selectedGateway, setSelectedGateway] = useState<string>('stripe');
    const [pricing, setPricing] = useState({ usd: 2.99, mad: 29 });

    useEffect(() => {
        if (isOpen) {
            fetchSubscriptionInfo();
        }
    }, [isOpen]);

    const fetchSubscriptionInfo = async () => {
        try {
            const res = await fetch('/api/subscription/status');
            if (res.ok) {
                const data = await res.json();
                setAvailableGateways(data.availableGateways || ['stripe']);
                setPricing(data.pricing || { usd: 2.99, mad: 29 });
                if (data.availableGateways?.length > 0) {
                    setSelectedGateway(data.availableGateways[0]);
                }
            }
        } catch (error) {
            console.error('Failed to fetch subscription info:', error);
        }
    };

    const handleUpgrade = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/subscription/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: selectedGateway })
            });

            if (res.ok) {
                const { url } = await res.json();
                window.location.href = url;
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to start checkout');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            alert('Failed to start checkout. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const featureNames = {
        coach: 'AI Coach',
        smart_plan: 'Smart Meal Plans'
    };

    const gatewayDisplayNames: Record<string, { name: string; icon: string }> = {
        stripe: { name: 'Credit Card', icon: '💳' },
        paypal: { name: 'PayPal', icon: '🅿️' },
        cmi: { name: 'CMI (Morocco)', icon: '🇲🇦' }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-emerald-500/20 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                            <Crown className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Upgrade to Premium</h2>
                            <p className="text-sm text-gray-400">Unlock unlimited access</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition">
                        <X size={24} />
                    </button>
                </div>

                {/* Limit Message */}
                {feature && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
                        <p className="text-amber-300 text-sm">
                            <Sparkles className="inline w-4 h-4 mr-1" />
                            You&apos;ve used all your free {featureNames[feature]} for today.
                            Upgrade to continue!
                        </p>
                    </div>
                )}

                {/* Pricing */}
                <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-white mb-1">
                        ${pricing.usd}<span className="text-lg text-gray-400">/month</span>
                    </div>
                    <p className="text-sm text-gray-500">or {pricing.mad} MAD/month</p>
                </div>

                {/* Benefits */}
                <div className="space-y-3 mb-6">
                    {[
                        '♾️ Unlimited AI Coach sessions',
                        '♾️ Unlimited Smart Meal Plans',
                        '📊 Advanced statistics & insights',
                        '🚫 No advertisements',
                        '⭐ Priority support',
                    ].map((benefit, i) => (
                        <div key={i} className="flex items-center gap-3 text-gray-300">
                            <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                            <span>{benefit}</span>
                        </div>
                    ))}
                </div>

                {/* Payment Method Selection */}
                {availableGateways.length > 1 && (
                    <div className="mb-6">
                        <label className="text-sm text-gray-400 mb-2 block">Payment Method</label>
                        <div className="grid grid-cols-3 gap-2">
                            {availableGateways.map(gateway => (
                                <button
                                    key={gateway}
                                    onClick={() => setSelectedGateway(gateway)}
                                    className={`p-3 rounded-xl text-center transition-all ${selectedGateway === gateway
                                        ? 'bg-emerald-500/20 border-2 border-emerald-500 text-white'
                                        : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:border-gray-600'
                                        }`}
                                >
                                    <span className="text-xl block mb-1">
                                        {gatewayDisplayNames[gateway]?.icon || '💳'}
                                    </span>
                                    <span className="text-xs">
                                        {gatewayDisplayNames[gateway]?.name || gateway}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* CTA Button */}
                <button
                    onClick={handleUpgrade}
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <CreditCard className="w-5 h-5" />
                            Upgrade Now
                        </>
                    )}
                </button>

                {/* Trust badges */}
                <p className="text-center text-xs text-gray-500 mt-4">
                    🔒 Secure payment • Cancel anytime • 7-day money-back guarantee
                </p>
            </div>
        </div>
    );
}
