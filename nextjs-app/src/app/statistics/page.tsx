'use client';

import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';

export default function StatisticsPage() {
    const { userId, theme, userName } = useUser();
    const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');

    // Sample data (would come from API)
    const stats = {
        daysLogged: period === 'week' ? 5 : period === 'month' ? 22 : 45,
        avgCalories: userId === 1 ? 1680 : 1390,
        avgProtein: userId === 1 ? 148 : 112,
        weightChange: userId === 1 ? -2.3 : -1.8,
        calorieAdherence: userId === 1 ? 92 : 88,
        proteinAdherence: userId === 1 ? 85 : 78,
        topFoods: [
            { name: 'Chicken breast', category: 'protein', timesEaten: 18, totalGrams: 3600 },
            { name: 'Rice (white)', category: 'carbs', timesEaten: 15, totalGrams: 2250 },
            { name: 'Eggs', category: 'protein', timesEaten: 14, totalGrams: 980 },
            { name: 'Greek yogurt', category: 'dairy', timesEaten: 12, totalGrams: 1800 },
            { name: 'Banana', category: 'fruits', timesEaten: 10, totalGrams: 1200 },
        ],
        weeklyData: [
            { day: 'Mon', calories: 1720, protein: 155 },
            { day: 'Tue', calories: 1650, protein: 142 },
            { day: 'Wed', calories: 1780, protein: 160 },
            { day: 'Thu', calories: 1600, protein: 138 },
            { day: 'Fri', calories: 1700, protein: 150 },
            { day: 'Sat', calories: 1850, protein: 165 },
            { day: 'Sun', calories: 1680, protein: 152 },
        ],
    };

    const maxCalories = Math.max(...stats.weeklyData.map(d => d.calories));

    return (
        <div className="animate-fade-in">
            <div className="mb-8">
                <h1 className="page-title">Your Progress 📈</h1>
                <p className="page-subtitle">Track your journey and see how far you've come, {userName}.</p>
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
                    <div className="text-4xl mb-2">📅</div>
                    <div className="stat-value">{stats.daysLogged}</div>
                    <div className="stat-label">Days Logged</div>
                </div>
                <div className="stat-card">
                    <div className="text-4xl mb-2">🔥</div>
                    <div className="stat-value">{stats.avgCalories}</div>
                    <div className="stat-label">Avg Calories/Day</div>
                </div>
                <div className="stat-card">
                    <div className="text-4xl mb-2">💪</div>
                    <div className="stat-value">{stats.avgProtein}g</div>
                    <div className="stat-label">Avg Protein/Day</div>
                </div>
                <div className="stat-card">
                    <div className="text-4xl mb-2">⚖️</div>
                    <div
                        className="stat-value"
                        style={{ color: stats.weightChange < 0 ? 'var(--success)' : 'var(--error)' }}
                    >
                        {stats.weightChange > 0 ? '+' : ''}{stats.weightChange} kg
                    </div>
                    <div className="stat-label">Weight Change</div>
                </div>
            </div>

            {/* Goal Adherence */}
            <div className="card mb-6">
                <h3 className="font-semibold mb-4">Goal Adherence</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="text-center">
                        <div className="relative w-32 h-32 mx-auto mb-4">
                            <svg className="w-full h-full" viewBox="0 0 36 36">
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="var(--bg-secondary)"
                                    strokeWidth="3"
                                />
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="var(--calories)"
                                    strokeWidth="3"
                                    strokeDasharray={`${stats.calorieAdherence}, 100`}
                                    style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-bold">{stats.calorieAdherence}%</span>
                            </div>
                        </div>
                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Calorie Target</div>
                    </div>
                    <div className="text-center">
                        <div className="relative w-32 h-32 mx-auto mb-4">
                            <svg className="w-full h-full" viewBox="0 0 36 36">
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="var(--bg-secondary)"
                                    strokeWidth="3"
                                />
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="var(--protein)"
                                    strokeWidth="3"
                                    strokeDasharray={`${stats.proteinAdherence}, 100`}
                                    style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-bold">{stats.proteinAdherence}%</span>
                            </div>
                        </div>
                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Protein Target</div>
                    </div>
                </div>
            </div>

            {/* Weekly Calorie Chart */}
            <div className="card mb-6">
                <h3 className="font-semibold mb-4">Calorie Trend</h3>
                <div className="h-64">
                    <div className="flex items-end justify-between h-full gap-2">
                        {stats.weeklyData.map((day, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center">
                                <div
                                    className="w-full rounded-t-lg transition-all hover:opacity-80"
                                    style={{
                                        height: `${(day.calories / maxCalories) * 100}%`,
                                        background: `linear-gradient(to top, ${theme.primary}, ${theme.secondary})`,
                                        minHeight: '20px'
                                    }}
                                />
                                <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{day.day}</div>
                                <div className="text-xs font-medium">{day.calories}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-center gap-4 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ background: theme.primary }} />
                        <span style={{ color: 'var(--text-muted)' }}>Daily Calories</span>
                    </div>
                    <div className="h-4 w-px" style={{ background: 'var(--border-color)' }} />
                    <span style={{ color: 'var(--text-muted)' }}>
                        Target: {userId === 1 ? '1,750' : '1,450'} kcal
                    </span>
                </div>
            </div>

            {/* Top Foods */}
            <div className="card">
                <h3 className="font-semibold mb-4">Your Most Eaten Foods</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-700">
                                <th className="text-left py-3 px-4">#</th>
                                <th className="text-left py-3 px-4">Food</th>
                                <th className="text-left py-3 px-4">Category</th>
                                <th className="text-right py-3 px-4">Times Eaten</th>
                                <th className="text-right py-3 px-4">Total Grams</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.topFoods.map((food, i) => (
                                <tr key={i} className="border-b border-gray-800">
                                    <td className="py-3 px-4">{i + 1}</td>
                                    <td className="py-3 px-4 font-medium">{food.name}</td>
                                    <td className="py-3 px-4">
                                        <span className="badge badge-primary">{food.category}</span>
                                    </td>
                                    <td className="text-right py-3 px-4">{food.timesEaten}x</td>
                                    <td className="text-right py-3 px-4">{food.totalGrams.toLocaleString()}g</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
