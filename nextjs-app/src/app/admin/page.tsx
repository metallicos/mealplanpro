'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import {
    Settings, Users, Mail, CreditCard, Utensils, Home,
    ChevronRight, TrendingUp, Clock, AlertCircle, Crown,
    FileText, Sparkles, Server, Shield, Activity
} from 'lucide-react';

interface DashboardStats {
    totalUsers: number;
    premiumUsers: number;
    trialUsers: number;
    newContactsCount: number;
    newsletterCount: number;
    totalMeals: number;
    recentSignups: number;
}

export default function AdminDashboard() {
    const { user, isLoading: isUserLoading } = useUser();
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isUserLoading) {
            if (!user || user.role !== 'admin') {
                router.push('/');
                return;
            }
            loadStats();
        }
    }, [user, isUserLoading, router]);

    const loadStats = async () => {
        try {
            // Load basic stats from existing endpoints
            const [usersRes, contactsRes, mealsRes] = await Promise.all([
                fetch('/api/admin/users'),
                fetch('/api/admin/contacts'),
                fetch('/api/admin/meals')
            ]);

            const users = usersRes.ok ? await usersRes.json() : [];
            const contacts = contactsRes.ok ? await contactsRes.json() : [];
            const meals = mealsRes.ok ? await mealsRes.json() : [];

            // Calculate stats
            const today = new Date();
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

            setStats({
                totalUsers: users.length,
                premiumUsers: 0, // Will be updated when subscription data is available
                trialUsers: 0,
                newContactsCount: contacts.filter((c: any) => c.status === 'new').length,
                newsletterCount: users.filter((u: any) => u.newsletter_subscribed === 1).length,
                totalMeals: meals.length,
                recentSignups: users.filter((u: any) => new Date(u.created_at) > weekAgo).length
            });
        } catch (error) {
            console.error('Failed to load stats', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isUserLoading || isLoading) {
        return <div className="p-8 text-center text-gray-400">Loading...</div>;
    }

    const quickStats = [
        { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'violet' },
        { label: 'This Week', value: stats?.recentSignups || 0, icon: TrendingUp, color: 'emerald' },
        { label: 'New Enquiries', value: stats?.newContactsCount || 0, icon: AlertCircle, color: 'amber' },
        { label: 'Newsletter', value: stats?.newsletterCount || 0, icon: Mail, color: 'cyan' },
    ];

    const managementSections = [
        {
            title: 'User Management',
            description: 'Manage users, roles, households, and newsletter subscribers',
            icon: Users,
            href: '/admin/legacy?tab=users',
            color: 'violet',
            items: [
                { label: 'All Users', href: '/admin/legacy?tab=users' },
                { label: 'Households', href: '/admin/legacy?tab=households' },
                { label: 'Newsletter Subscribers', href: '/admin/legacy?tab=newsletter' },
            ]
        },
        {
            title: 'Content Management',
            description: 'Manage meals, recipes, and other content',
            icon: Utensils,
            href: '/admin/legacy?tab=meals',
            color: 'amber',
            items: [
                { label: 'Meals & Recipes', href: '/admin/legacy?tab=meals' },
            ]
        },
        {
            title: 'Contact Enquiries',
            description: 'View and respond to user enquiries',
            icon: Mail,
            href: '/admin/legacy?tab=contacts',
            color: 'cyan',
            badge: stats?.newContactsCount || 0
        },
    ];

    const settingsSections = [
        {
            title: 'Analytics & Monitoring',
            description: 'View traffic, subscriptions, and revenue metrics',
            icon: Activity,
            href: '/admin/analytics',
            color: 'cyan'
        },
        {
            title: 'Email Configuration',
            description: 'Configure SMTP settings for email delivery',
            icon: Mail,
            href: '/admin/settings',
            color: 'violet'
        },
        {
            title: 'Payment Gateways',
            description: 'Configure Stripe, PayPal, and CMI payment settings',
            icon: CreditCard,
            href: '/admin/settings/payments',
            color: 'emerald'
        },
    ];

    const documentationLinks = [
        {
            title: 'Subscription System',
            description: 'How the premium subscription and payments work',
            icon: Crown,
            href: '/admin/docs/subscription-system'
        },
        {
            title: 'API Documentation',
            description: 'API endpoints and integration guides',
            icon: Server,
            href: '/admin/docs/api'
        },
    ];

    return (
        <div className="animate-fade-in max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-violet-500/20 rounded-lg">
                        <Shield className="w-6 h-6 text-violet-400" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
                </div>
                <p className="text-gray-400">Manage your application settings, users, and content</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {quickStats.map((stat, i) => (
                    <div key={i} className={`card p-4 border-l-4 border-${stat.color}-500`}>
                        <div className="flex items-center justify-between mb-2">
                            <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
                            <span className={`text-2xl font-bold text-${stat.color}-400`}>{stat.value}</span>
                        </div>
                        <div className="text-sm text-gray-400">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Main Sections Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Management Section */}
                <div className="card p-6">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-violet-400" />
                        Management
                    </h2>
                    <div className="space-y-3">
                        {managementSections.map((section, i) => (
                            <Link
                                key={i}
                                href={section.href}
                                className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg bg-${section.color}-500/20`}>
                                            <section.icon className={`w-5 h-5 text-${section.color}-400`} />
                                        </div>
                                        <div>
                                            <div className="font-medium flex items-center gap-2">
                                                {section.title}
                                                {section.badge && section.badge > 0 && (
                                                    <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded-full">
                                                        {section.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-400">{section.description}</div>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Settings Section */}
                <div className="card p-6">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-emerald-400" />
                        Configuration
                    </h2>
                    <div className="space-y-3">
                        {settingsSections.map((section, i) => (
                            <Link
                                key={i}
                                href={section.href}
                                className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg bg-${section.color}-500/20`}>
                                            <section.icon className={`w-5 h-5 text-${section.color}-400`} />
                                        </div>
                                        <div>
                                            <div className="font-medium">{section.title}</div>
                                            <div className="text-sm text-gray-400">{section.description}</div>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Quick Setup Checklist */}
                    <div className="mt-6 pt-4 border-t border-white/10">
                        <h3 className="font-medium mb-3 flex items-center gap-2 text-sm text-gray-400">
                            <Sparkles className="w-4 h-4" />
                            Setup Checklist
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-400">
                                <div className="w-4 h-4 rounded-full border border-gray-600 flex items-center justify-center text-xs">
                                    1
                                </div>
                                Configure SMTP for email delivery
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                                <div className="w-4 h-4 rounded-full border border-gray-600 flex items-center justify-center text-xs">
                                    2
                                </div>
                                Set up at least one payment gateway
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                                <div className="w-4 h-4 rounded-full border border-gray-600 flex items-center justify-center text-xs">
                                    3
                                </div>
                                Configure subscription pricing
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Documentation Section */}
            <div className="card p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-400" />
                    Documentation
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {documentationLinks.map((doc, i) => (
                        <Link
                            key={i}
                            href={doc.href}
                            className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-cyan-500/20">
                                    <doc.icon className="w-5 h-5 text-cyan-400" />
                                </div>
                                <div>
                                    <div className="font-medium">{doc.title}</div>
                                    <div className="text-sm text-gray-400">{doc.description}</div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 flex flex-wrap gap-3">
                <Link
                    href="/admin/legacy"
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-400 transition-colors"
                >
                    Legacy Admin View →
                </Link>
            </div>
        </div>
    );
}
