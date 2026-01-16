'use client';

import { useState, useEffect } from 'react';
import { Crown, Calendar, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import UpgradeModal from './UpgradeModal';

interface SubscriptionStatus {
    plan: 'free' | 'premium';
    status: string;
    isTrialing: boolean;
    trialDaysRemaining: number;
    periodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    provider: string | null;
}

export default function SubscriptionCard() {
    const [status, setStatus] = useState<SubscriptionStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [canceling, setCanceling] = useState(false);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/subscription/status');
            if (res.ok) {
                const data = await res.json();
                setStatus(data);
            }
        } catch (error) {
            console.error('Failed to fetch subscription status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelSubscription = async () => {
        if (!confirm('Are you sure you want to cancel? You will lose access to premium features at the end of your billing period.')) {
            return;
        }

        setCanceling(true);
        try {
            const res = await fetch('/api/subscription/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ immediate: false })
            });

            if (res.ok) {
                alert('Subscription canceled. You will have access until the end of your billing period.');
                fetchStatus();
            } else {
                alert('Failed to cancel subscription. Please try again.');
            }
        } catch (error) {
            console.error('Cancel error:', error);
            alert('Failed to cancel subscription.');
        } finally {
            setCanceling(false);
        }
    };

    if (loading) {
        return (
            <div className="card p-6 flex items-center justify-center">
                <Loader2 className="animate-spin text-gray-400" />
            </div>
        );
    }

    if (!status) return null;

    const isPremium = status.plan === 'premium' || status.isTrialing;

    return (
        <>
            <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Crown className={isPremium ? 'text-amber-400' : 'text-gray-500'} />
                        Subscription
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${isPremium
                        ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-gray-800 text-gray-400 border border-gray-700'
                        }`}>
                        {status.isTrialing ? 'Trial' : status.plan === 'premium' ? 'Premium' : 'Free'}
                    </span>
                </div>

                {/* Trial Banner */}
                {status.isTrialing && status.trialDaysRemaining > 0 && (
                    <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-3">
                            <Calendar className="text-amber-400" />
                            <div>
                                <p className="text-amber-300 font-medium">
                                    {status.trialDaysRemaining} days left in your free trial
                                </p>
                                <p className="text-xs text-gray-400">
                                    Upgrade now to keep your premium access
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Cancellation Warning */}
                {status.cancelAtPeriodEnd && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="text-red-400" />
                            <div>
                                <p className="text-red-300 font-medium">
                                    Subscription ending soon
                                </p>
                                <p className="text-xs text-gray-400">
                                    Your access expires on {status.periodEnd ? new Date(status.periodEnd).toLocaleDateString() : 'soon'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Current Plan Details */}
                <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Current Plan</span>
                        <span className="text-white">
                            {status.isTrialing ? 'Premium Trial' : status.plan === 'premium' ? 'Premium' : 'Free'}
                        </span>
                    </div>

                    {status.periodEnd && !status.isTrialing && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">
                                {status.cancelAtPeriodEnd ? 'Access Until' : 'Next Billing'}
                            </span>
                            <span className="text-white">
                                {new Date(status.periodEnd).toLocaleDateString()}
                            </span>
                        </div>
                    )}

                    {status.provider && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Payment Method</span>
                            <span className="text-white capitalize">{status.provider}</span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    {!isPremium && (
                        <button
                            onClick={() => setShowUpgradeModal(true)}
                            className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl font-bold transition-all"
                        >
                            Upgrade to Premium
                        </button>
                    )}

                    {status.isTrialing && (
                        <button
                            onClick={() => setShowUpgradeModal(true)}
                            className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-bold transition-all"
                        >
                            Subscribe Now
                        </button>
                    )}

                    {status.plan === 'premium' && !status.isTrialing && status.provider === 'stripe' && (
                        <a
                            href="/api/subscription/portal"
                            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-all text-center flex items-center justify-center gap-2"
                        >
                            Manage Billing
                            <ExternalLink size={16} />
                        </a>
                    )}

                    {status.plan === 'premium' && !status.isTrialing && !status.cancelAtPeriodEnd && (
                        <button
                            onClick={handleCancelSubscription}
                            disabled={canceling}
                            className="py-3 px-4 bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-all disabled:opacity-50"
                        >
                            {canceling ? 'Canceling...' : 'Cancel'}
                        </button>
                    )}
                </div>
            </div>

            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                trialDaysRemaining={status.trialDaysRemaining}
            />
        </>
    );
}
