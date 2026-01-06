'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

const navItems = [
    { href: '/', labelKey: 'dashboard', icon: '📊' },
    { href: '/macros', labelKey: 'trackMacros', icon: '🍽️' },
    { href: '/calculator', labelKey: 'calculator', icon: '🔢' },
    { href: '/meals', labelKey: 'mealLibrary', icon: '📚' },
    { href: '/statistics', labelKey: 'statistics', icon: '📈' },
    { href: '/groceries', labelKey: 'groceryList', icon: '🛒' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useUser();
    const t = useTranslations('nav');
    const tCommon = useTranslations('common');
    const tLang = useTranslations('languages');

    const [currentLocale, setCurrentLocale] = useState('en');

    useEffect(() => {
        // Get current locale from cookie
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
        router.refresh(); // Refresh to apply new language
    };

    if (!user) return null;

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">🍽️</div>
                <span className="sidebar-logo-text">{tCommon('appName')}</span>
            </div>

            <nav className="flex-1">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-item ${pathname === item.href ? 'active' : ''}`}
                    >
                        <span className="nav-item-icon">{item.icon}</span>
                        <span>{t(item.labelKey)}</span>
                    </Link>
                ))}

                {user.role === 'admin' && (
                    <Link
                        href="/admin"
                        className={`nav-item ${pathname === '/admin' ? 'active' : ''}`}
                    >
                        <span className="nav-item-icon">⚙️</span>
                        <span>{t('adminPanel')}</span>
                    </Link>
                )}
            </nav>

            <div className="mt-auto">
                {/* Language Switcher */}
                <div className="mb-3 px-2">
                    <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <button
                            onClick={() => switchLanguage('en')}
                            className={`flex-1 py-1.5 px-2 text-xs rounded transition-all ${currentLocale === 'en'
                                    ? 'bg-violet-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            🇬🇧 {tLang('en')}
                        </button>
                        <button
                            onClick={() => switchLanguage('fr')}
                            className={`flex-1 py-1.5 px-2 text-xs rounded transition-all ${currentLocale === 'fr'
                                    ? 'bg-violet-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            🇫🇷 {tLang('fr')}
                        </button>
                    </div>
                </div>

                {/* User Info */}
                <div className="p-4 rounded-lg mb-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <p className="text-sm font-medium text-white">{user.fullName}</p>
                    <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                    {user.householdName && (
                        <p className="text-xs text-gray-500 mt-1">🏠 {user.householdName}</p>
                    )}
                </div>

                <button
                    onClick={() => logout()}
                    className="flex items-center gap-2 w-full p-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
                >
                    <span>🚪</span> {tCommon('signOut')}
                </button>
            </div>
        </aside>
    );
}
