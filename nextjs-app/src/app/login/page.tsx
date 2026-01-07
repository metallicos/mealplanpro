'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useUser();
    const t = useTranslations('auth');
    const tCommon = useTranslations('common');
    const tLang = useTranslations('languages');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentLocale, setCurrentLocale] = useState('en');

    useEffect(() => {
        const localeCookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('locale='))
            ?.split('=')[1];
        if (localeCookie) setCurrentLocale(localeCookie);
    }, []);

    const switchLanguage = async (locale: string) => {
        await fetch('/api/locale', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locale }),
        });
        setCurrentLocale(locale);
        router.refresh();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(email, password);
            router.push('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : t('loginFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-primary)]">
            {/* Language Switcher - Top Right */}
            <div className="absolute top-4 right-4 flex gap-1 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <button
                    onClick={() => switchLanguage('en')}
                    className={`py-1.5 px-3 text-xs rounded transition-all ${currentLocale === 'en'
                        ? 'bg-violet-600 text-white'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    🇬🇧 {tLang('en')}
                </button>
                <button
                    onClick={() => switchLanguage('fr')}
                    className={`py-1.5 px-3 text-xs rounded transition-all ${currentLocale === 'fr'
                        ? 'bg-violet-600 text-white'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    🇫🇷 {tLang('fr')}
                </button>
            </div>

            <div className="card w-full max-w-md p-8 animate-fade-in">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                        {tCommon('appName')}
                    </h1>
                    <p className="text-[var(--text-secondary)]">{t('signInToAccount')}</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="form-label block mb-1">{t('email')}</label>
                        <input
                            type="email"
                            className="form-input w-full"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="yours@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="form-label block mb-1">{t('password')}</label>
                        <input
                            type="password"
                            className="form-input w-full"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-primary w-full py-3 mt-4"
                        disabled={isLoading}
                    >
                        {isLoading ? '...' : t('signIn')}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-400">
                    {t('noAccount') || "Don't have an account?"}{' '}
                    <Link href="/signup" className="text-violet-400 hover:text-violet-300">
                        {t('signUp') || "Sign up"}
                    </Link>
                </div>
            </div>
        </div>
    );
}
