'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
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
    const { user, theme } = useUser();
    const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month');
    const [loading, setLoading] = useState(true);
    const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
    const [groceryData, setGroceryData] = useState<GroceryBudget[]>([]);

    // Fetch real data
    useEffect(() => {
        if (!user) return;

        setLoading(true);
        Promise.all([
            fetch(`/api/weight-logs?user_id=${user.id}&limit=12`).then(r => r.json()),
            fetch('/api/groceries').then(r => r.json())
        ])
            .then(([weightData, groceryResult]) => {
                setWeightLogs(weightData.logs || []);
                setGroceryData(groceryResult.budgets || []);
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
                    <p className="text-gray-400">Loading your statistics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="mb-8">
                <h1 className="page-title flex items-center gap-3"><TrendingUp className="w-8 h-8 text-[var(--accent-primary)]" /> Your Progress</h1>
                <p className="page-subtitle">Track your journey and see how far you've come, {user?.fullName}.</p>
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
                            {p === 'week' ? 'Last 7 Days' : p === 'month' ? 'Last 30 Days' : 'All Time'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="stat-card">
                    <div className="text-4xl mb-2 flex justify-center"><Calendar className="w-8 h-8 text-[var(--accent-secondary)]" /></div>
                    <div className="stat-value">{stats.daysLogged}</div>
                    <div className="stat-label">Weeks Logged</div>
                </div>
                <div className="stat-card">
                    <div className="text-4xl mb-2 flex justify-center"><Scale className="w-8 h-8 text-[var(--accent-primary)]" /></div>
                    <div className="stat-value">{stats.currentWeight || '—'}</div>
                    <div className="stat-label">Current Weight (kg)</div>
                </div>
                <div className="stat-card">
                    <div className="text-4xl mb-2 flex justify-center"><TrendingDown className="w-8 h-8 text-[var(--success)]" /></div>
                    <div
                        className="stat-value"
                        style={{ color: stats.weightChange < 0 ? 'var(--success)' : stats.weightChange > 0 ? 'var(--error)' : 'inherit' }}
                    >
                        {stats.weightChange > 0 ? '+' : ''}{stats.weightChange || '—'} kg
                    </div>
                    <div className="stat-label">Weight Change</div>
                </div>
                <div className="stat-card">
                    <div className="text-4xl mb-2 flex justify-center"><ShoppingCart className="w-8 h-8 text-blue-400" /></div>
                    <div className="stat-value">{stats.completionRate}%</div>
                    <div className="stat-label">Shopping Completed</div>
                </div>
            </div>

            {/* Budget Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="card">
                    <h3 className="font-semibold mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-400" /> Grocery Budget Overview</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Total Budget</span>
                            <span className="font-bold text-lg">{stats.totalBudget.toFixed(2)} MAD</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Total Spent</span>
                            <span className="font-bold text-lg" style={{ color: 'var(--error)' }}>{stats.totalSpent.toFixed(2)} MAD</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Remaining</span>
                            <span className="font-bold text-lg" style={{ color: stats.budgetRemaining >= 0 ? 'var(--success)' : 'var(--error)' }}>
                                {stats.budgetRemaining.toFixed(2)} MAD
                            </span>
                        </div>
                        <div className="pt-4 border-t border-gray-700">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-400">Items Purchased</span>
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
                    <h3 className="font-semibold mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-[var(--accent-secondary)]" /> Top Grocery Categories</h3>
                    {stats.topCategories.length > 0 ? (
                        <div className="space-y-3">
                            {stats.topCategories.map(([category, count], i) => (
                                <div key={category} className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                        style={{ background: theme.primary, color: 'white' }}>
                                        {i + 1}
                                    </span>
                                    <span className="flex-1 capitalize">{category}</span>
                                    <span className="text-gray-400">{count} items</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-center py-8">No grocery data yet</p>
                    )}
                </div>
            </div>

            {/* Weight Trend Chart */}
            <div className="card mb-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Scale className="w-5 h-5" /> Weight Trend</h3>
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
                        <p className="text-gray-400">No weight logs yet.</p>
                        <p className="text-sm text-gray-500 mt-1">Log your weight in the Calculator page to see trends.</p>
                    </div>
                )}
                {stats.weeklyWeights.length > 0 && (
                    <div className="flex items-center justify-center gap-4 mt-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ background: theme.primary }} />
                            <span style={{ color: 'var(--text-muted)' }}>Weekly Weight</span>
                        </div>

                    </div>
                )}
            </div>

            {/* Empty State */}
            {weightLogs.length === 0 && groceryData.length === 0 && (
                <div className="card text-center py-12">
                    <div className="flex justify-center mb-4"><BarChart3 className="w-16 h-16 text-gray-700" /></div>
                    <h3 className="text-xl font-semibold mb-2">No Data Yet</h3>
                    <p className="text-gray-400 mb-4">Start tracking your weight and groceries to see your progress here.</p>
                    <div className="flex gap-4 justify-center">
                        <a href="/calculator" className="btn-primary px-6 py-2">Log Weight</a>
                        <a href="/groceries" className="btn-secondary px-6 py-2">Add Groceries</a>
                    </div>
                </div>
            )}
        </div>
    );
}
