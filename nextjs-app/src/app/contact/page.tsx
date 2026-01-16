'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Send, CheckCircle2, Loader2, Clock, Globe } from 'lucide-react';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: 'general',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to send message');
            }

            setIsSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send message');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-[#050507] text-white flex items-center justify-center p-4">
                <div className="text-center max-w-md animate-fade-in">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-6">
                        <CheckCircle2 size={40} />
                    </div>
                    <h1 className="text-3xl font-bold mb-4">Message Sent!</h1>
                    <p className="text-gray-400 mb-8">
                        Thank you for reaching out. We'll get back to you within 24-48 hours.
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-bold hover:scale-105 transition-transform"
                    >
                        <ArrowLeft size={18} /> Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050507] text-white">
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
                >
                    <ArrowLeft size={18} /> Back to Home
                </Link>

                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                        <Mail size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold">Contact Us</h1>
                        <p className="text-gray-400">We'd love to hear from you</p>
                    </div>
                </div>

                <div className="bg-[#12121a] rounded-2xl border border-white/10 p-6 md:p-8">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg mb-6">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-400 mb-2">Your Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-colors"
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-400 mb-2">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-colors"
                                    placeholder="john@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-400 mb-2">Subject</label>
                            <select
                                className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-colors appearance-none"
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            >
                                <option value="general">General Inquiry</option>
                                <option value="support">Technical Support</option>
                                <option value="feedback">Feedback & Suggestions</option>
                                <option value="bug">Bug Report</option>
                                <option value="partnership">Partnership Opportunity</option>
                                <option value="privacy">Privacy Concerns</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-400 mb-2">Message</label>
                            <textarea
                                required
                                rows={6}
                                className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500 transition-colors resize-none"
                                placeholder="How can we help you?"
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-bold hover:shadow-lg hover:shadow-cyan-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" /> Sending...
                                </>
                            ) : (
                                <>
                                    <Send size={20} /> Send Message
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <div className="p-6 rounded-xl bg-white/5 border border-white/5">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto mb-3">
                            <Mail size={24} />
                        </div>
                        <div className="font-semibold mb-1">Email</div>
                        <div className="text-sm text-gray-400">support@mealplanpro.app</div>
                    </div>
                    <div className="p-6 rounded-xl bg-white/5 border border-white/5">
                        <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400 mx-auto mb-3">
                            <Clock size={24} />
                        </div>
                        <div className="font-semibold mb-1">Response Time</div>
                        <div className="text-sm text-gray-400">24-48 hours</div>
                    </div>
                    <div className="p-6 rounded-xl bg-white/5 border border-white/5">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-3">
                            <Globe size={24} />
                        </div>
                        <div className="font-semibold mb-1">Location</div>
                        <div className="text-sm text-gray-400">Worldwide Support</div>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-white/10 text-center text-gray-500 text-sm">
                    © {new Date().getFullYear()} MealPlan Pro. All rights reserved.
                </div>
            </div>
        </div>
    );
}
