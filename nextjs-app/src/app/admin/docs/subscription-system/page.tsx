'use client';

import Link from 'next/link';
import {
    ArrowLeft, Crown, CreditCard, Users, Clock, Shield,
    CheckCircle, Settings, Sparkles, AlertTriangle, Zap,
    DollarSign, Globe, Database
} from 'lucide-react';

export default function SubscriptionSystemDocs() {
    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/admin/overview"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4"
                >
                    <ArrowLeft size={16} />
                    Back to Admin
                </Link>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                        <Crown className="w-6 h-6 text-amber-400" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Subscription System</h1>
                </div>
                <p className="text-gray-400">
                    Complete guide to configuring and managing premium subscriptions
                </p>
            </div>

            {/* Overview */}
            <section className="card p-6 mb-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-violet-400" />
                    Overview
                </h2>
                <p className="text-gray-300 mb-4">
                    MealPlan Pro uses a <strong>freemium model</strong> with the following tiers:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Free Tier */}
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <h3 className="font-bold mb-2 text-gray-300">Free Tier</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li className="flex items-center gap-2">
                                <CheckCircle size={14} className="text-emerald-400" />
                                Manual meal planning
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle size={14} className="text-emerald-400" />
                                Calorie tracking
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle size={14} className="text-emerald-400" />
                                Recipe access
                            </li>
                            <li className="flex items-center gap-2">
                                <AlertTriangle size={14} className="text-amber-400" />
                                AI Coach: 2 sessions/day
                            </li>
                            <li className="flex items-center gap-2">
                                <AlertTriangle size={14} className="text-amber-400" />
                                Smart Plans: 2/week
                            </li>
                        </ul>
                    </div>

                    {/* Premium Tier */}
                    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <h3 className="font-bold mb-2 text-amber-400 flex items-center gap-2">
                            <Crown size={16} />
                            Premium Tier
                        </h3>
                        <ul className="space-y-2 text-sm text-gray-300">
                            <li className="flex items-center gap-2">
                                <CheckCircle size={14} className="text-emerald-400" />
                                Everything in Free
                            </li>
                            <li className="flex items-center gap-2">
                                <Zap size={14} className="text-amber-400" />
                                Unlimited AI Coach
                            </li>
                            <li className="flex items-center gap-2">
                                <Zap size={14} className="text-amber-400" />
                                Unlimited Smart Plans
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle size={14} className="text-emerald-400" />
                                Advanced statistics
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle size={14} className="text-emerald-400" />
                                Ad-free experience
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                    <h3 className="font-bold mb-2 text-cyan-400 flex items-center gap-2">
                        <Clock size={16} />
                        14-Day Free Trial
                    </h3>
                    <p className="text-sm text-gray-300">
                        All new users automatically receive a 14-day premium trial upon signup.
                        No credit card required. This is created automatically in the signup flow.
                    </p>
                </div>
            </section>

            {/* Payment Gateways */}
            <section className="card p-6 mb-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-400" />
                    Payment Gateways
                </h2>
                <p className="text-gray-300 mb-4">
                    The system supports three payment providers. Configure them at{' '}
                    <Link href="/admin/settings/payments" className="text-violet-400 hover:underline">
                        Admin → Settings → Payments
                    </Link>
                </p>

                <div className="space-y-4">
                    {/* Stripe */}
                    <div className="p-4 rounded-lg bg-white/5">
                        <h3 className="font-bold mb-2 flex items-center gap-2">
                            <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center text-violet-400 text-xs font-bold">
                                S
                            </div>
                            Stripe (Recommended)
                        </h3>
                        <p className="text-sm text-gray-400 mb-3">
                            Best for international payments. Supports recurring subscriptions via Stripe Billing.
                        </p>
                        <div className="text-sm space-y-2">
                            <h4 className="font-medium text-gray-300">Setup Steps:</h4>
                            <ol className="list-decimal list-inside space-y-1 text-gray-400">
                                <li>Create a Stripe account at <a href="https://stripe.com" target="_blank" className="text-violet-400 hover:underline">stripe.com</a></li>
                                <li>Create a Product → Add a recurring Price (e.g., $2.99/month)</li>
                                <li>Copy the <strong>Price ID</strong> (starts with price_)</li>
                                <li>Get your API keys from Developers → API Keys</li>
                                <li>Create a webhook endpoint pointing to <code className="bg-black/50 px-2 py-1 rounded">/api/subscription/webhook/stripe</code></li>
                                <li>Enter all credentials in Admin → Settings → Payments → Stripe</li>
                            </ol>
                        </div>
                    </div>

                    {/* PayPal */}
                    <div className="p-4 rounded-lg bg-white/5">
                        <h3 className="font-bold mb-2 flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 text-xs font-bold">
                                P
                            </div>
                            PayPal
                        </h3>
                        <p className="text-sm text-gray-400 mb-3">
                            Alternative for users who prefer PayPal. Supports recurring subscriptions.
                        </p>
                        <div className="text-sm space-y-2">
                            <h4 className="font-medium text-gray-300">Setup Steps:</h4>
                            <ol className="list-decimal list-inside space-y-1 text-gray-400">
                                <li>Create a PayPal Business account</li>
                                <li>Go to Developer Dashboard → Create App</li>
                                <li>Create a Subscription Plan under Products</li>
                                <li>Copy Client ID, Secret, and Plan ID</li>
                                <li>Set webhook URL to <code className="bg-black/50 px-2 py-1 rounded">/api/subscription/webhook/paypal</code></li>
                                <li>Enter credentials in Admin → Settings → Payments → PayPal</li>
                            </ol>
                        </div>
                    </div>

                    {/* CMI */}
                    <div className="p-4 rounded-lg bg-white/5">
                        <h3 className="font-bold mb-2 flex items-center gap-2">
                            <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 text-xs font-bold">
                                CMI
                            </div>
                            CMI (Morocco)
                        </h3>
                        <p className="text-sm text-gray-400 mb-3">
                            Morocco&apos;s main payment processor. Supports local card payments in MAD currency.
                        </p>
                        <div className="text-sm space-y-2">
                            <h4 className="font-medium text-gray-300">Setup Steps:</h4>
                            <ol className="list-decimal list-inside space-y-1 text-gray-400">
                                <li>Contact CMI to get merchant account</li>
                                <li>Obtain Merchant ID and Store Key</li>
                                <li>Configure callback URLs for success/failure</li>
                                <li>Enter credentials in Admin → Settings → Payments → CMI</li>
                            </ol>
                        </div>
                        <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                            <p className="text-xs text-amber-300">
                                <strong>Note:</strong> CMI is only shown to users in Morocco.
                                This option supports one-time payments with manual renewal reminders.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Configuration Guide */}
            <section className="card p-6 mb-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-amber-400" />
                    Configuration Guide
                </h2>

                <div className="space-y-4">
                    <div>
                        <h3 className="font-medium mb-2 flex items-center gap-2">
                            <DollarSign size={16} className="text-emerald-400" />
                            Pricing Settings
                        </h3>
                        <p className="text-sm text-gray-400 mb-2">
                            Configure at <Link href="/admin/settings/payments" className="text-violet-400 hover:underline">Admin → Settings → Payments → General</Link>
                        </p>
                        <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
                            <li><strong>Premium Price (USD):</strong> Monthly price for international users</li>
                            <li><strong>Premium Price (MAD):</strong> Monthly price for Moroccan users</li>
                            <li><strong>Trial Period:</strong> Number of days for free trial (default: 14)</li>
                        </ul>
                    </div>

                    <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <h3 className="font-medium mb-2 text-emerald-400">Quick Setup Checklist</h3>
                        <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                            <li>Go to <strong>Admin → Settings → Payments</strong></li>
                            <li>Set your pricing (USD and MAD amounts)</li>
                            <li>Enable at least one payment gateway</li>
                            <li>For Stripe: Create product, copy Price ID</li>
                            <li>Configure webhook URLs in your payment provider</li>
                            <li>Test with sandbox/test mode first</li>
                            <li>Switch to live mode when ready</li>
                        </ol>
                    </div>
                </div>
            </section>

            {/* Technical Architecture */}
            <section className="card p-6 mb-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-cyan-400" />
                    Technical Architecture
                </h2>

                <div className="space-y-4 text-sm">
                    <div>
                        <h3 className="font-medium mb-2 text-gray-300">Database Tables</h3>
                        <ul className="text-gray-400 space-y-1">
                            <li><code className="bg-black/50 px-2 py-1 rounded">subscriptions</code> - User subscription status, trial info, payment provider</li>
                            <li><code className="bg-black/50 px-2 py-1 rounded">feature_usage</code> - Tracks daily/weekly feature usage limits</li>
                            <li><code className="bg-black/50 px-2 py-1 rounded">payment_transactions</code> - Payment history and receipts</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-medium mb-2 text-gray-300">API Endpoints</h3>
                        <ul className="text-gray-400 space-y-1">
                            <li><code className="bg-black/50 px-2 py-1 rounded">GET /api/subscription/status</code> - Get user&apos;s subscription status</li>
                            <li><code className="bg-black/50 px-2 py-1 rounded">POST /api/subscription/checkout</code> - Start checkout flow</li>
                            <li><code className="bg-black/50 px-2 py-1 rounded">POST /api/subscription/cancel</code> - Cancel subscription</li>
                            <li><code className="bg-black/50 px-2 py-1 rounded">POST /api/subscription/webhook/stripe</code> - Stripe webhooks</li>
                            <li><code className="bg-black/50 px-2 py-1 rounded">POST /api/subscription/webhook/paypal</code> - PayPal webhooks</li>
                            <li><code className="bg-black/50 px-2 py-1 rounded">POST /api/subscription/webhook/cmi</code> - CMI callbacks</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-medium mb-2 text-gray-300">Key Files</h3>
                        <ul className="text-gray-400 space-y-1">
                            <li><code className="bg-black/50 px-2 py-1 rounded">src/lib/subscription.ts</code> - Core subscription logic</li>
                            <li><code className="bg-black/50 px-2 py-1 rounded">src/lib/payment/</code> - Payment gateway implementations</li>
                            <li><code className="bg-black/50 px-2 py-1 rounded">src/components/subscription/</code> - UI components</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Feature Gating */}
            <section className="card p-6 mb-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-400" />
                    Feature Gating
                </h2>

                <p className="text-gray-300 mb-4">
                    Premium features are gated with usage limits for free users:
                </p>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10 text-left">
                                <th className="p-3 text-gray-400">Feature</th>
                                <th className="p-3 text-gray-400">Free Limit</th>
                                <th className="p-3 text-gray-400">Premium</th>
                                <th className="p-3 text-gray-400">Reset Period</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-white/5">
                                <td className="p-3">AI Coach</td>
                                <td className="p-3 text-amber-400">2 per day</td>
                                <td className="p-3 text-emerald-400">Unlimited</td>
                                <td className="p-3 text-gray-400">Daily (midnight)</td>
                            </tr>
                            <tr className="border-b border-white/5">
                                <td className="p-3">Smart Meal Plans</td>
                                <td className="p-3 text-amber-400">2 per week</td>
                                <td className="p-3 text-emerald-400">Unlimited</td>
                                <td className="p-3 text-gray-400">Weekly (Monday)</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 p-4 rounded-lg bg-violet-500/10 border border-violet-500/30">
                    <h3 className="font-medium mb-2 text-violet-400">How It Works</h3>
                    <p className="text-sm text-gray-300">
                        When a user exceeds their limit, the API returns a 429 status with upgrade information.
                        The frontend shows an <code className="bg-black/50 px-1 rounded">UpgradeModal</code> component
                        prompting them to subscribe.
                    </p>
                </div>
            </section>

            {/* User Flow */}
            <section className="card p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-violet-400" />
                    User Flow
                </h2>

                <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold">
                            1
                        </div>
                        <div>
                            <h3 className="font-medium mb-1">New User Signup</h3>
                            <p className="text-sm text-gray-400">
                                User creates account → 14-day premium trial automatically activated
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold">
                            2
                        </div>
                        <div>
                            <h3 className="font-medium mb-1">Trial Period</h3>
                            <p className="text-sm text-gray-400">
                                User enjoys full premium access. SubscriptionCard shows days remaining.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold">
                            3
                        </div>
                        <div>
                            <h3 className="font-medium mb-1">Trial Expires or Upgrade</h3>
                            <p className="text-sm text-gray-400">
                                User prompted to upgrade via UpgradeModal. Chooses payment method.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                            4
                        </div>
                        <div>
                            <h3 className="font-medium mb-1">Payment Complete</h3>
                            <p className="text-sm text-gray-400">
                                Webhook updates subscription status. User redirected to success page.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                            5
                        </div>
                        <div>
                            <h3 className="font-medium mb-1">Active Premium</h3>
                            <p className="text-sm text-gray-400">
                                User has unlimited access. Can manage billing via Stripe portal or cancel.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
