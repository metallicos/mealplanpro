'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    UtensilsCrossed,
    Calculator,
    BookOpen,
    LineChart,
    ShoppingCart,
    MessageSquare,
    User,
    Settings,
    LogOut,
    Utensils,
    Home,
    Globe,
    Timer,
    Heart
} from 'lucide-react';

const navItems = [
    { href: '/', labelKey: 'dashboard', icon: LayoutDashboard },
    { href: '/macros', labelKey: 'trackMacros', icon: UtensilsCrossed },
    { href: '/fasting', labelKey: 'fasting', icon: Timer },
    { href: '/coach', labelKey: 'coach', icon: Heart },
    { href: '/calculator', labelKey: 'calculator', icon: Calculator },
    { href: '/meals', labelKey: 'mealLibrary', icon: BookOpen },
    { href: '/statistics', labelKey: 'statistics', icon: LineChart },
    { href: '/groceries', labelKey: 'groceryList', icon: ShoppingCart },
    { href: '/forum', labelKey: 'forum', icon: MessageSquare },
    { href: '/profile', labelKey: 'profile', icon: User },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useUser();
    const t = useTranslations('nav');
    const tCommon = useTranslations('common');
    const tLang = useTranslations('languages');

    const [currentLocale, setCurrentLocale] = useState('en');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Get current locale from cookie
        const localeCookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('locale='))
            ?.split('=')[1];
        if (localeCookie) setCurrentLocale(localeCookie);
    }, []);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // Close sidebar when clicking outside on mobile
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setIsOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
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

    if (!user) return null;

    return (
        <>
            {/* Mobile Header Bar */}
            <div className="mobile-header">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="hamburger-btn"
                    aria-label="Toggle menu"
                >
                    <span className={`hamburger-line ${isOpen ? 'open' : ''}`}></span>
                    <span className={`hamburger-line ${isOpen ? 'open' : ''}`}></span>
                    <span className={`hamburger-line ${isOpen ? 'open' : ''}`}></span>
                </button>
                <div className="mobile-logo">
                    <Utensils className="w-6 h-6 text-emerald-500" />
                    <span>{tCommon('appName')}</span>
                </div>
                <div className="mobile-user">
                    {user.fullName.split(' ')[0]}
                </div>
            </div>

            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="sidebar-backdrop"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">
                        <Utensils className="text-white" size={24} />
                    </div>
                    <span className="sidebar-logo-text">{tCommon('appName')}</span>
                </div>

                <nav className="flex-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`nav-item ${pathname === item.href ? 'active' : ''}`}
                            onClick={() => setIsOpen(false)}
                        >
                            <span className="nav-item-icon"><item.icon size={20} /></span>
                            <span>{t(item.labelKey)}</span>
                        </Link>
                    ))}

                    {user.role === 'admin' && (
                        <Link
                            href="/admin"
                            className={`nav-item ${pathname === '/admin' ? 'active' : ''}`}
                            onClick={() => setIsOpen(false)}
                        >
                            <span className="nav-item-icon"><Settings size={20} /></span>
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
                                className={`flex-1 py-1.5 px-2 text-xs rounded transition-all flex items-center justify-center gap-1 ${currentLocale === 'en'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                <Globe size={12} /> {tLang('en')}
                            </button>
                            <button
                                onClick={() => switchLanguage('fr')}
                                className={`flex-1 py-1.5 px-2 text-xs rounded transition-all flex items-center justify-center gap-1 ${currentLocale === 'fr'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                <Globe size={12} /> {tLang('fr')}
                            </button>
                        </div>
                    </div>

                    {/* User Info */}
                    <Link href="/profile" className="block p-4 rounded-lg mb-2 cursor-pointer transition-colors hover:bg-white/10" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-600 overflow-hidden flex-shrink-0 border border-gray-400">
                                {user.avatarUrl ? (
                                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white text-xs">
                                        {user.fullName?.[0]}
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-white truncate">{user.fullName}</p>
                                <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                            </div>
                        </div>
                        {user.householdName && (
                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1"><Home size={12} /> {user.householdName}</p>
                        )}
                    </Link>

                    <button
                        onClick={() => logout()}
                        className="flex items-center gap-2 w-full p-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
                    >
                        <LogOut size={18} />
                        <span>{tCommon('signOut')}</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
