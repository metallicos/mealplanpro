'use client';

import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsPage() {
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
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <FileText size={24} />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold">Terms of Service</h1>
                </div>

                <div className="prose prose-invert prose-lg max-w-none">
                    <p className="text-gray-400 text-lg mb-8">
                        Last updated: January 16, 2026
                    </p>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-emerald-400 mb-4">1. Acceptance of Terms</h2>
                        <p className="text-gray-300 leading-relaxed">
                            By accessing or using MealPlan Pro, you agree to be bound by these Terms of Service.
                            If you do not agree to these terms, please do not use our service.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-emerald-400 mb-4">2. Description of Service</h2>
                        <p className="text-gray-300 leading-relaxed">
                            MealPlan Pro is a nutrition tracking, meal planning, and health management application.
                            We provide tools to log meals, track macros, monitor fasting, scan products, and receive
                            AI-powered nutrition coaching. The service is provided "as is" without warranties.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-emerald-400 mb-4">3. User Accounts</h2>
                        <p className="text-gray-300 leading-relaxed mb-4">When creating an account, you agree to:</p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>Provide accurate and complete information.</li>
                            <li>Maintain the security of your password and account.</li>
                            <li>Notify us immediately of any unauthorized access.</li>
                            <li>Be responsible for all activities under your account.</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-emerald-400 mb-4">4. Acceptable Use</h2>
                        <p className="text-gray-300 leading-relaxed mb-4">You agree NOT to:</p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>Use the service for any unlawful purpose.</li>
                            <li>Share false or misleading health information.</li>
                            <li>Attempt to access other users' accounts.</li>
                            <li>Interfere with or disrupt the service.</li>
                            <li>Use automated tools to scrape or collect data.</li>
                            <li>Post harmful, offensive, or inappropriate content.</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-emerald-400 mb-4">5. Health Disclaimer</h2>
                        <p className="text-gray-300 leading-relaxed">
                            <strong className="text-yellow-400">Important:</strong> MealPlan Pro is NOT a substitute for professional
                            medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider
                            before making changes to your diet or exercise routine. The nutritional information and
                            AI recommendations are for informational purposes only.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-emerald-400 mb-4">6. Intellectual Property</h2>
                        <p className="text-gray-300 leading-relaxed">
                            All content, features, and functionality of MealPlan Pro (including text, graphics, logos,
                            and software) are owned by MealPlan Pro and protected by copyright, trademark, and other
                            intellectual property laws.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-emerald-400 mb-4">7. User Content</h2>
                        <p className="text-gray-300 leading-relaxed">
                            You retain ownership of content you post (meal photos, forum posts, etc.). By posting,
                            you grant us a non-exclusive license to use, display, and distribute your content within
                            the service. You are responsible for ensuring you have rights to content you post.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-emerald-400 mb-4">8. Termination</h2>
                        <p className="text-gray-300 leading-relaxed">
                            We reserve the right to suspend or terminate your account at any time for violations of
                            these terms or for any other reason. You may delete your account at any time through your
                            profile settings.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-emerald-400 mb-4">9. Limitation of Liability</h2>
                        <p className="text-gray-300 leading-relaxed">
                            MealPlan Pro shall not be liable for any indirect, incidental, special, consequential, or
                            punitive damages resulting from your use of the service. Our total liability shall not
                            exceed the amount you paid us in the past 12 months.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-emerald-400 mb-4">10. Changes to Terms</h2>
                        <p className="text-gray-300 leading-relaxed">
                            We may update these terms from time to time. We will notify you of significant changes
                            via email or in-app notification. Continued use after changes constitutes acceptance of
                            the new terms.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-emerald-400 mb-4">11. Contact</h2>
                        <p className="text-gray-300 leading-relaxed">
                            For questions about these Terms, please visit our{' '}
                            <Link href="/contact" className="text-emerald-400 hover:text-emerald-300">
                                contact page
                            </Link>{' '}
                            or email <span className="text-emerald-400">legal@mealplanpro.app</span>.
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
