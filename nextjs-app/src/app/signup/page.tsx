'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import Link from 'next/link';
import { User, UserCheck } from 'lucide-react';

export default function SignupPage() {
    const router = useRouter();
    // const { login } = useUser();

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        family_name: '',
        gender: 'male'
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Dynamic Theme based on selection
    useEffect(() => {
        const root = document.documentElement;
        if (formData.gender === 'female') {
            root.style.setProperty('--accent-primary', '#ec4899');
            root.style.setProperty('--accent-secondary', '#f472b6');
            root.style.setProperty('--accent-gradient', 'linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #fb7185 100%)');
            root.style.setProperty('--accent-glow', '0 0 30px rgba(236, 72, 153, 0.3)');
        } else {
            root.style.setProperty('--accent-primary', '#6366f1');
            root.style.setProperty('--accent-secondary', '#8b5cf6');
            root.style.setProperty('--accent-gradient', 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)');
            root.style.setProperty('--accent-glow', '0 0 30px rgba(99, 102, 241, 0.3)');
        }
    }, [formData.gender]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Signup failed');
            }

            // Successfully signed up and logged in (via cookie)
            // Trigger a refresh of the user context if possible, or just redirect
            // Ideally UserContext should re-fetch on mount, so redirecting works.
            // But if we are already "logged in" in state? No, we were likely guest/null.
            window.location.href = '/'; // Hard reload to ensure context picks up new session
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-primary)]">
            <div className="card w-full max-w-md p-8 animate-fade-in relative">
                <Link href="/login" className="absolute top-8 left-8 text-gray-500 hover:text-white">
                    ← Back
                </Link>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
                        Create Account
                    </h1>
                    <p className="text-[var(--text-secondary)]">Start your healthy journey today</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="form-label block mb-1">Full Name</label>
                        <input
                            type="text"
                            className="form-input w-full"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            placeholder="John Doe"
                            required
                        />
                    </div>
                    <div>
                        <label className="form-label block mb-1">Email Address</label>
                        <input
                            type="email"
                            className="form-input w-full"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="john@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="form-label block mb-1">Password</label>
                        <input
                            type="password"
                            className="form-input w-full"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    <div>
                        <label className="form-label block mb-1">Gender</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, gender: 'male' })}
                                className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${formData.gender === 'male'
                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                    : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-800'
                                    }`}
                            >
                                <User size={18} /> Male
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, gender: 'female' })}
                                className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${formData.gender === 'female'
                                    ? 'bg-pink-500 border-pink-400 text-white shadow-lg shadow-pink-500/30'
                                    : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-800'
                                    }`}
                            >
                                <UserCheck size={18} /> Female
                            </button>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-gray-800">
                        <label className="form-label block mb-1">Family Name (Optional)</label>
                        <p className="text-xs text-gray-500 mb-2">Create a new family group for your household.</p>
                        <input
                            type="text"
                            className="form-input w-full"
                            value={formData.family_name}
                            onChange={(e) => setFormData({ ...formData, family_name: e.target.value })}
                            placeholder="e.g. The Smiths"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-primary w-full py-3 mt-4"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-400">
                    Already have an account?{' '}
                    <Link href="/login" className="text-violet-400 hover:text-violet-300">
                        Log in
                    </Link>
                </div>
            </div>
        </div>
    );
}
