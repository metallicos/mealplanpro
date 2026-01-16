'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { XCircle, ArrowLeft, HelpCircle } from 'lucide-react';

export default function SubscriptionCancelPage() {
    const searchParams = useSearchParams();
    const reason = searchParams.get('reason');

    const errorMessages: Record<string, string> = {
        'invalid_order': 'Invalid order information. Please try again.',
        'error': 'An error occurred during payment processing.',
        'declined': 'Your payment was declined. Please try a different payment method.',
    };

    const message = reason ? errorMessages[reason] || 'Payment was not completed.' : 'Payment was canceled.';

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-4">
            <div className="max-w-md w-full text-center">
                {/* Icon */}
                <div className="w-20 h-20 mx-auto rounded-full bg-gray-800 flex items-center justify-center mb-6">
                    <XCircle className="w-10 h-10 text-gray-500" />
                </div>

                {/* Message */}
                <h1 className="text-2xl font-bold text-white mb-3">
                    Payment Canceled
                </h1>
                <p className="text-gray-400 mb-8">
                    {message}
                </p>

                {/* Info Box */}
                <div className="bg-slate-900 border border-gray-800 rounded-xl p-4 mb-8 text-left">
                    <div className="flex items-start gap-3">
                        <HelpCircle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-gray-400">
                            <p className="mb-2">Don&apos;t worry! No charges were made to your account.</p>
                            <p>You can try again anytime or contact support if you need help.</p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Return to App
                    </Link>
                </div>

                <p className="text-xs text-gray-500 mt-8">
                    Need help? Contact support@mealplanpro.app
                </p>
            </div>
        </div>
    );
}
