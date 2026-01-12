'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useTranslations } from 'next-intl';
import {
    BarChart3, TrendingUp, Calendar, Scale, TrendingDown,
    ShoppingCart, DollarSign, Package, Activity
} from 'lucide-react';

interface WeightLog {
    id: number;
    weight: number;
    week_start: string;
    notes?: string;
}

interface GroceryItem {
    id: number;
    name: string;
    quantity: number;
    price: number;
    purchased: boolean;
    category: string;
}

interface GroceryBudget {
    id: number;
    week_start: string;
    budget_amount: number;
    items: GroceryItem[];
}

export default function StatisticsPage() {
    const t = useTranslations('statistics');
    const { user, theme, settings } = useUser();
    const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month');
    const [loading, setLoading] = useState(true);
    const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
    const [groceryData, setGroceryData] = useState<GroceryBudget[]>([]);

    // Currency formatter
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(settings.currency === 'MAD' ? 'fr-MA' : 'en-US', {
            style: 'currency',
            currency: settings.currency || 'USD',
            maximumFractionDigits: 2
        }).format(amount);
    };

    // Fetch real data
    useEffect(() => {
        if (!user) return;

        setLoading(true);
        Promise.all([
            fetch(`/api/weight-logs?user_id=${user.id}&limit=12`).then(r => r.json()),
            fetch('/api/groceries').then(r => r.json())
        ])
            .then(([weightData, groceryResult]) => {
                // Fix: API returns array directly for weight logs
                const logs = Array.isArray(weightData) ? weightData.map((log: any) => ({
                    ...log,
                    week_start: log.weekDate // Map weekDate to week_start
                })) : (weightData.logs || []);
                setWeightLogs(logs);

                // Fix: API returns Record<string, Budget> for groceries
                const budgets = Array.isArray(groceryResult) ? groceryResult :
                    (groceryResult.budgets ? groceryResult.budgets : Object.values(groceryResult));

                const mappedBudgets = budgets.map((b: any) => ({
                    id: b.id || 0,
                    week_start: b.month || '',
                    budget_amount: b.initial_budget || 0,
                    items: (b.items || []).map((item: any) => ({
                        id: item.id,
                        name: item.name,
                        quantity: item.quantity || 1,
                        // Use actual price if available (and purchased?), otherwise estimated
                        price: item.actual_price || item.estimated_price_per_unit || 0,
                        purchased: !!item.is_purchased,
                        category: item.category || 'other'
                    }))
                }));

                setGroceryData(mappedBudgets);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [user]);

    // Calculate real statistics
    const calculateStats = () => {
        // Weight stats
        const sortedLogs = [...weightLogs].sort((a, b) =>
            new Date(b.week_start).getTime() - new Date(a.week_start).getTime()
        );

        const currentWeight = sortedLogs[0]?.weight || 0;
        const oldestWeight = sortedLogs[sortedLogs.length - 1]?.weight || currentWeight;
        const weightChange = sortedLogs.length > 1 ? Number((currentWeight - oldestWeight).toFixed(1)) : 0;

        // Grocery stats
        const totalBudget = groceryData.reduce((sum, b) => sum + b.budget_amount, 0);
        const totalSpent = groceryData.reduce((sum, b) =>
            sum + b.items.reduce((isum, item) => isum + (item.price * item.quantity), 0), 0
        );
        const purchasedItems = groceryData.reduce((sum, b) =>
            sum + b.items.filter(i => i.purchased).length, 0
        );
        const totalItems = groceryData.reduce((sum, b) => sum + b.items.length, 0);

        // Get grocery categories breakdown
        const categoryCount: Record<string, number> = {};
        groceryData.forEach(budget => {
            budget.items.forEach(item => {
                categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
            });
        });
        const topCategories = Object.entries(categoryCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        return {
            daysLogged: weightLogs.length,
            currentWeight,
            weightChange,
            totalBudget,
            totalSpent,
            budgetRemaining: totalBudget - totalSpent,
            purchasedItems,
            totalItems,
            completionRate: totalItems > 0 ? Math.round((purchasedItems / totalItems) * 100) : 0,
            topCategories,
            weeklyWeights: sortedLogs.slice(0, 8).reverse(),
        };
    };

    const stats = calculateStats();
    const maxWeight = stats.weeklyWeights.length > 0
        ? Math.max(...stats.weeklyWeights.map(w => w.weight))
        : 100;
    const minWeight = stats.weeklyWeights.length > 0
        ? Math.min(...stats.weeklyWeights.map(w => w.weight))
        : 0;
    const weightRange = maxWeight - minWeight || 1;

    if (loading) {
        return (
            <div className="animate-fade-in flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <div className="text-4xl mb-4 flex justify-center"><BarChart3 className="w-16 h-16 text-gray-700 animate-pulse" /></div>
                    <p className="text-gray-400">{t('loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="mb-8">
                <h1 className="page-title flex items-center gap-3"><TrendingUp className="w-8 h-8 text-[var(--accent-primary)]" /> {t('title')}</h1>
                <p className="page-subtitle">{t('subtitle', { name: user?.fullName })}</p>
            </div>

            {/* Period Selector */}
            <div className="card mb-6">
                <div className="flex gap-2">
                    {(['week', 'month', 'all'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === p
                                ? 'text-white'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                            style={period === p ? { background: theme.gradient } : {}}
                        >
                            {t(`periods.${p}`)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="stat-card">
                    <div className="text-4xl mb-2 flex justify-center"><Calendar className="w-8 h-8 text-[var(--accent-secondary)]" /></div>
                    <div className="stat-value">{stats.daysLogged}</div>
                    <div className="stat-label">{t('cards.weeksLogged')}</div>
                </div>
                <div className="stat-card">
                    <div className="text-4xl mb-2 flex justify-center"><Scale className="w-8 h-8 text-[var(--accent-primary)]" /></div>
                    <div className="stat-value">{stats.currentWeight || '—'}</div>
                    <div className="stat-label">{t('cards.currentWeight')}</div>
                </div>
                <div className="stat-card">
                    <div className="text-4xl mb-2 flex justify-center"><TrendingDown className="w-8 h-8 text-[var(--success)]" /></div>
                    <div
                        className="stat-value"
                        style={{ color: stats.weightChange < 0 ? 'var(--success)' : stats.weightChange > 0 ? 'var(--error)' : 'inherit' }}
                    >
                        {stats.weightChange > 0 ? '+' : ''}{stats.weightChange || '—'} kg
                    </div>
                    <div className="stat-label">{t('cards.weightChange')}</div>
                </div>
                <div className="stat-card">
                    <div className="text-4xl mb-2 flex justify-center"><ShoppingCart className="w-8 h-8 text-blue-400" /></div>
                    <div className="stat-value">{stats.completionRate}%</div>
                    <div className="stat-label">{t('cards.shoppingCompleted')}</div>
                </div>
            </div>

            {/* Budget Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="card">
                    <h3 className="font-semibold mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-400" /> {t('budget.title')}</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">{t('budget.totalBudget')}</span>
                            <span className="font-bold text-lg">{formatCurrency(stats.totalBudget)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">{t('budget.totalSpent')}</span>
                            <span className="font-bold text-lg" style={{ color: 'var(--error)' }}>{formatCurrency(stats.totalSpent)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">{t('budget.remaining')}</span>
                            <span className="font-bold text-lg" style={{ color: stats.budgetRemaining >= 0 ? 'var(--success)' : 'var(--error)' }}>
                                {formatCurrency(stats.budgetRemaining)}
                            </span>
                        </div>
                        <div className="pt-4 border-t border-gray-700">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-400">{t('budget.itemsPurchased')}</span>
                                <span>{stats.purchasedItems} / {stats.totalItems}</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                    className="h-2 rounded-full transition-all"
                                    style={{
                                        width: `${stats.completionRate}%`,
                                        background: theme.gradient
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Categories */}
                <div className="card">
                    <h3 className="font-semibold mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-[var(--accent-secondary)]" /> {t('categories.title')}</h3>
                    {stats.topCategories.length > 0 ? (
                        <div className="space-y-3">
                            {stats.topCategories.map(([category, count], i) => (
                                <div key={category} className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                        style={{ background: theme.primary, color: 'white' }}>
                                        {i + 1}
                                    </span>
                                    <span className="flex-1 capitalize">{category}</span>
                                    <span className="text-gray-400">{count} {t('categories.itemsSuffix')}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-center py-8">{t('categories.noData')}</p>
                    )}
                </div>
            </div>

            {/* Weight Trend Chart */}
            <div className="card mb-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Scale className="w-5 h-5" /> {t('weightTrend.title')}</h3>
                {stats.weeklyWeights.length > 0 ? (
                    <div className="h-64">
                        <div className="flex items-end justify-between h-full gap-2">
                            {stats.weeklyWeights.map((log, i) => {
                                const heightPercent = ((log.weight - minWeight) / weightRange) * 80 + 20;
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center">
                                        <div
                                            className="w-full rounded-t-lg transition-all hover:opacity-80"
                                            style={{
                                                height: `${heightPercent}%`,
                                                background: `linear-gradient(to top, ${theme.primary}, ${theme.secondary})`,
                                                minHeight: '20px'
                                            }}
                                        />
                                        <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                                            {new Date(log.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </div>
                                        <div className="text-xs font-medium">{log.weight} kg</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="flex justify-center mb-4"><Scale className="w-16 h-16 text-gray-700" /></div>
                        <p className="text-gray-400">{t('weightTrend.noLogs')}</p>
                        <p className="text-sm text-gray-500 mt-1">{t('weightTrend.logPrompt')}</p>
                    </div>
                )}
                {stats.weeklyWeights.length > 0 && (
                    <div className="flex items-center justify-center gap-4 mt-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ background: theme.primary }} />
                            <span style={{ color: 'var(--text-muted)' }}>{t('weightTrend.weeklyWeight')}</span>
                        </div>

                    </div>
                )}
            </div>

            {/* Empty State */}
            {weightLogs.length === 0 && groceryData.length === 0 && (
                <div className="card text-center py-12">
                    <div className="flex justify-center mb-4"><BarChart3 className="w-16 h-16 text-gray-700" /></div>
                    <h3 className="text-xl font-semibold mb-2">{t('empty.title')}</h3>
                    <p className="text-gray-400 mb-4">{t('empty.description')}</p>
                    <div className="flex gap-4 justify-center">
                        <a href="/calculator" className="btn-primary px-6 py-2">{t('empty.logWeight')}</a>
                        <a href="/groceries" className="btn-secondary px-6 py-2">{t('empty.addGroceries')}</a>
                    </div>
                </div>
            )}
        </div>
    );
}
