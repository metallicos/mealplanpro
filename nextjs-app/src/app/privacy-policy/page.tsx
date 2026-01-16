'use client';

import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-[#050507] text-white">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
                >
                    <ArrowLeft size={18} /> Back to Home
                </Link>

                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                        <Shield size={24} />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold">Privacy Policy</h1>
                </div>

                <div className="prose prose-invert prose-lg max-w-none">
                    <p className="text-gray-400 text-lg mb-8">
                        Last updated: January 16, 2026
                    </p>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-cyan-400 mb-4">1. Introduction</h2>
                        <p className="text-gray-300 leading-relaxed">
                            Welcome to MealPlan Pro. We respect your privacy and are committed to protecting your personal data.
                            This privacy policy explains how we collect, use, and safeguard your information when you use our
                            nutrition tracking and meal planning application.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-cyan-400 mb-4">2. Information We Collect</h2>
                        <p className="text-gray-300 leading-relaxed mb-4">We collect the following types of information:</p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li><strong>Account Information:</strong> Name, email address, password (encrypted), gender, and optional profile photo.</li>
                            <li><strong>Health Data:</strong> Age, height, weight, dietary preferences, allergies, and fitness goals.</li>
                            <li><strong>Usage Data:</strong> Meals logged, water intake, fasting records, and nutrition statistics.</li>
                            <li><strong>Device Information:</strong> Browser type, device type, and IP address for security purposes.</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-cyan-400 mb-4">3. How We Use Your Information</h2>
                        <p className="text-gray-300 leading-relaxed mb-4">Your data is used to:</p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>Provide personalized nutrition recommendations and meal plans.</li>
                            <li>Track your progress toward health and fitness goals.</li>
                            <li>Improve our AI coaching features and app functionality.</li>
                            <li>Send important account notifications and optional newsletters (with your consent).</li>
                            <li>Ensure the security and integrity of our platform.</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-cyan-400 mb-4">4. Data Sharing</h2>
                        <p className="text-gray-300 leading-relaxed">
                            We do <strong>not</strong> sell, rent, or trade your personal information to third parties.
                            We may share anonymized, aggregated data for research purposes. Your data may be shared with
                            service providers (hosting, analytics) who are bound by strict confidentiality agreements.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-cyan-400 mb-4">5. Data Security</h2>
                        <p className="text-gray-300 leading-relaxed">
                            We implement industry-standard security measures including encrypted connections (HTTPS),
                            secure password hashing (bcrypt), and regular security audits. However, no method of
                            transmission over the Internet is 100% secure.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-cyan-400 mb-4">6. Your Rights</h2>
                        <p className="text-gray-300 leading-relaxed mb-4">You have the right to:</p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>Access and download your personal data.</li>
                            <li>Correct inaccurate information in your profile.</li>
                            <li>Delete your account and all associated data.</li>
                            <li>Opt-out of marketing communications at any time.</li>
                            <li>Request a copy of your data in a portable format.</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-cyan-400 mb-4">7. Cookies</h2>
                        <p className="text-gray-300 leading-relaxed">
                            We use essential cookies to maintain your session and preferences. We do not use
                            third-party tracking cookies for advertising purposes.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-cyan-400 mb-4">8. Contact Us</h2>
                        <p className="text-gray-300 leading-relaxed">
                            If you have any questions about this Privacy Policy, please contact us at{' '}
                            <Link href="/contact" className="text-cyan-400 hover:text-cyan-300">
                                our contact page
                            </Link>{' '}
                            or email us at <span className="text-cyan-400">privacy@mealplanpro.app</span>.
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t border-white/10 text-center text-gray-500 text-sm">
                    © {new Date().getFullYear()} MealPlan Pro. All rights reserved.
                </div>
            </div>
        </div>
    );
}
