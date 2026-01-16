'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Crown, Sparkles, ArrowRight, Loader2 } from 'lucide-react';

export default function SubscriptionSuccessPage() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const provider = searchParams.get('provider') || 'stripe';

    useEffect(() => {
        // Give a moment for the webhook to process
        const timer = setTimeout(() => setLoading(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
                    <p className="text-gray-400">Processing your subscription...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-4">
            <div className="max-w-md w-full text-center">
                {/* Success Animation */}
                <div className="relative mb-8">
                    <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center animate-bounce-slow">
                        <CheckCircle className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-32 h-32 rounded-full border-4 border-emerald-500/30 animate-ping"></div>
                    </div>
                </div>

                {/* Message */}
                <h1 className="text-3xl font-bold text-white mb-3 flex items-center justify-center gap-2">
                    <Crown className="text-amber-400" />
                    Welcome to Premium!
                </h1>
                <p className="text-gray-400 mb-8">
                    Your subscription has been activated successfully. Enjoy unlimited access to all premium features!
                </p>

                {/* Features Unlocked */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-emerald-500/20 rounded-2xl p-6 mb-8">
                    <h3 className="font-bold text-emerald-400 mb-4 flex items-center justify-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        Features Unlocked
                    </h3>
                    <div className="space-y-3 text-left">
                        {[
                            '♾️ Unlimited AI Coach sessions',
                            '♾️ Unlimited Smart Meal Plans',
                            '📊 Advanced statistics',
                            '🚫 No advertisements',
                        ].map((feature, i) => (
                            <div key={i} className="flex items-center gap-3 text-gray-300">
                                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                <span>{feature}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/25 transition-all"
                >
                    Start Exploring
                    <ArrowRight className="w-5 h-5" />
                </Link>

                <p className="text-xs text-gray-500 mt-6">
                    Payment processed via {provider}. Receipt sent to your email.
                </p>
            </div>
        </div>
    );
}
