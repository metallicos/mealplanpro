'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, TrendingUp, TrendingDown, Users, Eye, MousePointer,
    Crown, CreditCard, Activity, Smartphone, Monitor, Tablet,
    ChevronDown, RefreshCw, Calendar, BarChart3, PieChart
} from 'lucide-react';

interface DashboardStats {
    today: { pageViews: number; uniqueVisitors: number; newUsers: number };
    week: { pageViews: number; uniqueVisitors: number; newUsers: number; growth: number };
    month: { pageViews: number; uniqueVisitors: number; newUsers: number };
    subscriptions: { active: number; trial: number; newThisMonth: number; churnedThisMonth: number; mrr: number };
}

interface ChartData {
    labels: string[];
    pageViews: number[];
    visitors: number[];
    newUsers: number[];
}

interface TopPage {
    path: string;
    views: number;
    percentage: number;
}

interface DeviceStats {
    mobile: number;
    desktop: number;
    tablet: number;
}

export default function AnalyticsDashboard() {
    const { user, isLoading: isUserLoading } = useUser();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [topPages, setTopPages] = useState<TopPage[]>([]);
    const [deviceStats, setDeviceStats] = useState<DeviceStats | null>(null);
    const [chartDays, setChartDays] = useState(30);
    const [activeTab, setActiveTab] = useState<'traffic' | 'subscriptions'>('traffic');

    useEffect(() => {
        if (!isUserLoading) {
            if (!user || user.role !== 'admin') {
                router.push('/');
                return;
            }
            loadData();
        }
    }, [user, isUserLoading, router]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [statsRes, chartRes, topPagesRes, devicesRes] = await Promise.all([
                fetch('/api/admin/analytics?type=dashboard'),
                fetch(`/api/admin/analytics?type=traffic-chart&days=${chartDays}`),
                fetch('/api/admin/analytics?type=top-pages'),
                fetch('/api/admin/analytics?type=devices')
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (chartRes.ok) setChartData(await chartRes.json());
            if (topPagesRes.ok) setTopPages(await topPagesRes.json());
            if (devicesRes.ok) setDeviceStats(await devicesRes.json());
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isUserLoading && user?.role === 'admin') {
            fetch(`/api/admin/analytics?type=traffic-chart&days=${chartDays}`)
                .then(res => res.json())
                .then(data => setChartData(data))
                .catch(console.error);
        }
    }, [chartDays, isUserLoading, user?.role]);

    if (isUserLoading || isLoading) {
        return <div className="p-8 text-center text-gray-400">Loading analytics...</div>;
    }

    // Calculate device percentages
    const totalDevices = (deviceStats?.mobile || 0) + (deviceStats?.desktop || 0) + (deviceStats?.tablet || 0);
    const mobilePercent = totalDevices ? Math.round((deviceStats?.mobile || 0) / totalDevices * 100) : 0;
    const desktopPercent = totalDevices ? Math.round((deviceStats?.desktop || 0) / totalDevices * 100) : 0;
    const tabletPercent = totalDevices ? Math.round((deviceStats?.tablet || 0) / totalDevices * 100) : 0;

    // Simple bar chart renderer
    const renderSimpleBarChart = (data: number[], labels: string[], color: string) => {
        const maxValue = Math.max(...data, 1);
        return (
            <div className="flex items-end gap-1 h-40">
                {data.map((value, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                            className={`w-full rounded-t ${color} transition-all duration-300`}
                            style={{ height: `${(value / maxValue) * 100}%`, minHeight: value > 0 ? '4px' : '0' }}
                            title={`${labels[i]}: ${value}`}
                        />
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/admin"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-4"
                >
                    <ArrowLeft size={16} />
                    Back to Admin
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 mb-2">
                            <Activity className="w-7 h-7 text-cyan-400" />
                            Analytics Dashboard
                        </h1>
                        <p className="text-gray-400">Monitor traffic, subscriptions, and revenue</p>
                    </div>
                    <button
                        onClick={loadData}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Today's Page Views */}
                <div className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                        <Eye className="w-5 h-5 text-cyan-400" />
                        <span className="text-xs text-gray-500">Today</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{stats?.today.pageViews || 0}</div>
                    <div className="text-sm text-gray-400">Page Views</div>
                </div>

                {/* This Week with Growth */}
                <div className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                        <MousePointer className="w-5 h-5 text-violet-400" />
                        {(stats?.week.growth || 0) >= 0 ? (
                            <span className="text-xs text-emerald-400 flex items-center gap-1">
                                <TrendingUp size={12} />
                                +{stats?.week.growth}%
                            </span>
                        ) : (
                            <span className="text-xs text-red-400 flex items-center gap-1">
                                <TrendingDown size={12} />
                                {stats?.week.growth}%
                            </span>
                        )}
                    </div>
                    <div className="text-2xl font-bold text-white">{stats?.week.uniqueVisitors || 0}</div>
                    <div className="text-sm text-gray-400">Visitors This Week</div>
                </div>

                {/* New Users */}
                <div className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                        <Users className="w-5 h-5 text-emerald-400" />
                        <span className="text-xs text-gray-500">This Month</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{stats?.month.newUsers || 0}</div>
                    <div className="text-sm text-gray-400">New Users</div>
                </div>

                {/* Active Subscriptions */}
                <div className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                        <Crown className="w-5 h-5 text-amber-400" />
                        <span className="text-xs text-amber-400">{stats?.subscriptions.trial || 0} trials</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{stats?.subscriptions.active || 0}</div>
                    <div className="text-sm text-gray-400">Active Premium</div>
                </div>
            </div>

            {/* Subscription Metrics Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="card p-4 border-l-4 border-emerald-500">
                    <div className="text-sm text-gray-400 mb-1">New Subs (Month)</div>
                    <div className="text-xl font-bold text-emerald-400">{stats?.subscriptions.newThisMonth || 0}</div>
                </div>
                <div className="card p-4 border-l-4 border-red-500">
                    <div className="text-sm text-gray-400 mb-1">Churned (Month)</div>
                    <div className="text-xl font-bold text-red-400">{stats?.subscriptions.churnedThisMonth || 0}</div>
                </div>
                <div className="card p-4 border-l-4 border-cyan-500">
                    <div className="text-sm text-gray-400 mb-1">Trial Users</div>
                    <div className="text-xl font-bold text-cyan-400">{stats?.subscriptions.trial || 0}</div>
                </div>
                <div className="card p-4 border-l-4 border-amber-500">
                    <div className="text-sm text-gray-400 mb-1">MRR</div>
                    <div className="text-xl font-bold text-amber-400">${stats?.subscriptions.mrr || 0}</div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Traffic Chart */}
                <div className="lg:col-span-2 card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-cyan-400" />
                            Traffic Overview
                        </h2>
                        <div className="flex items-center gap-2">
                            <select
                                value={chartDays}
                                onChange={(e) => setChartDays(Number(e.target.value))}
                                className="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm"
                            >
                                <option value={7}>Last 7 days</option>
                                <option value={14}>Last 14 days</option>
                                <option value={30}>Last 30 days</option>
                                <option value={90}>Last 90 days</option>
                            </select>
                        </div>
                    </div>

                    {chartData && chartData.pageViews.length > 0 ? (
                        <div>
                            {renderSimpleBarChart(chartData.pageViews, chartData.labels, 'bg-gradient-to-t from-cyan-600 to-cyan-400')}
                            <div className="flex justify-between mt-2 text-xs text-gray-500">
                                <span>{chartData.labels[0]}</span>
                                <span>{chartData.labels[chartData.labels.length - 1]}</span>
                            </div>
                            <div className="flex items-center gap-6 mt-4 text-sm">
                                <span className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded bg-cyan-500"></span>
                                    Page Views
                                </span>
                                <span className="text-gray-400">
                                    Total: {chartData.pageViews.reduce((a, b) => a + b, 0)}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="h-40 flex items-center justify-center text-gray-500">
                            No traffic data yet. Install the analytics tracking to start collecting data.
                        </div>
                    )}
                </div>

                {/* Device Breakdown */}
                <div className="card p-6">
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-violet-400" />
                        Devices
                    </h2>

                    {totalDevices > 0 ? (
                        <div className="space-y-4">
                            {/* Desktop */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="flex items-center gap-2 text-sm">
                                        <Monitor size={16} className="text-blue-400" />
                                        Desktop
                                    </span>
                                    <span className="text-sm text-gray-400">{desktopPercent}%</span>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all"
                                        style={{ width: `${desktopPercent}%` }}
                                    />
                                </div>
                            </div>

                            {/* Mobile */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="flex items-center gap-2 text-sm">
                                        <Smartphone size={16} className="text-emerald-400" />
                                        Mobile
                                    </span>
                                    <span className="text-sm text-gray-400">{mobilePercent}%</span>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full transition-all"
                                        style={{ width: `${mobilePercent}%` }}
                                    />
                                </div>
                            </div>

                            {/* Tablet */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="flex items-center gap-2 text-sm">
                                        <Tablet size={16} className="text-amber-400" />
                                        Tablet
                                    </span>
                                    <span className="text-sm text-gray-400">{tabletPercent}%</span>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-amber-500 rounded-full transition-all"
                                        style={{ width: `${tabletPercent}%` }}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/10 text-sm text-gray-400">
                                Total: {totalDevices.toLocaleString()} visits
                            </div>
                        </div>
                    ) : (
                        <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
                            No device data available
                        </div>
                    )}
                </div>
            </div>

            {/* Top Pages */}
            <div className="card p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-cyan-400" />
                    Top Pages (Last 30 Days)
                </h2>

                {topPages.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10 text-left text-sm text-gray-400">
                                    <th className="pb-3">Page</th>
                                    <th className="pb-3 text-right">Views</th>
                                    <th className="pb-3 text-right">%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topPages.map((page, i) => (
                                    <tr key={i} className="border-b border-white/5">
                                        <td className="py-3">
                                            <code className="text-sm text-gray-300 bg-black/30 px-2 py-0.5 rounded">
                                                {page.path}
                                            </code>
                                        </td>
                                        <td className="py-3 text-right font-mono text-cyan-400">
                                            {page.views.toLocaleString()}
                                        </td>
                                        <td className="py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-cyan-500 rounded-full"
                                                        style={{ width: `${page.percentage}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm text-gray-400 w-10 text-right">
                                                    {page.percentage}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-8 text-center text-gray-500">
                        No page data available yet
                    </div>
                )}
            </div>

            {/* Integration Note */}
            <div className="mt-8 p-4 rounded-lg bg-violet-500/10 border border-violet-500/30">
                <h3 className="font-medium text-violet-400 mb-2">Setup Instructions</h3>
                <p className="text-sm text-gray-300 mb-3">
                    To start collecting analytics, add the tracking hook to your root layout:
                </p>
                <pre className="bg-black/50 p-3 rounded text-sm text-gray-300 overflow-x-auto">
                    {`// In your layout or app component:
import { useAnalytics } from '@/hooks/useAnalytics';

function MyApp({ children }) {
  useAnalytics({ userId: user?.id });
  return children;
}`}
                </pre>
            </div>
        </div>
    );
}
