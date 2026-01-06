'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';

// Sample foods (would come from API in production)
const sampleFoods = [
    { id: 1, name: 'Chicken breast (grilled)', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    { id: 2, name: 'Rice (cooked white)', calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
    { id: 3, name: 'Eggs (whole)', calories: 155, protein: 13, carbs: 1.1, fat: 11 },
    { id: 4, name: 'Greek yogurt (plain)', calories: 59, protein: 10, carbs: 3.6, fat: 0.7 },
    { id: 5, name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
    { id: 6, name: 'Almonds', calories: 579, protein: 21, carbs: 22, fat: 50 },
    { id: 7, name: 'Oatmeal (cooked)', calories: 68, protein: 2.4, carbs: 12, fat: 1.4 },
    { id: 8, name: 'Beef (ground, lean)', calories: 250, protein: 26, carbs: 0, fat: 15 },
    { id: 9, name: 'Salmon (baked)', calories: 208, protein: 20, carbs: 0, fat: 13 },
    { id: 10, name: 'Broccoli (steamed)', calories: 35, protein: 2.4, carbs: 7, fat: 0.4 },
];

interface LogItem {
    id: number;
    foodName: string;
    grams: number;
    mealType: 'main' | 'snack';
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

export default function MacrosPage() {
    const { userId, theme, settings } = useUser();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [logItems, setLogItems] = useState<LogItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFood, setSelectedFood] = useState<typeof sampleFoods[0] | null>(null);
    const [grams, setGrams] = useState(100);
    const [mealType, setMealType] = useState<'main' | 'snack'>('main');
    const [weight, setWeight] = useState<number | null>(null);

    // Use targets from user settings
    const targets = {
        calories: settings.dailyCalorieTarget,
        protein: settings.proteinTarget,
        carbs: settings.carbsTarget,
        fat: settings.fatTarget,
    };

    const totals = logItems.reduce((acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const searchResults = searchQuery
        ? sampleFoods.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : [];

    const selectFood = (food: typeof sampleFoods[0]) => {
        setSelectedFood(food);
        setSearchQuery(food.name);
    };

    const addToLog = () => {
        if (!selectedFood) return;

        const multiplier = grams / 100;
        const newItem: LogItem = {
            id: Date.now(),
            foodName: selectedFood.name,
            grams,
            mealType,
            calories: Math.round(selectedFood.calories * multiplier),
            protein: Math.round(selectedFood.protein * multiplier * 10) / 10,
            carbs: Math.round(selectedFood.carbs * multiplier * 10) / 10,
            fat: Math.round(selectedFood.fat * multiplier * 10) / 10,
        };

        setLogItems([...logItems, newItem]);
        setSearchQuery('');
        setSelectedFood(null);
        setGrams(100);
    };

    const removeFromLog = (id: number) => {
        setLogItems(logItems.filter(i => i.id !== id));
    };

    const preview = selectedFood ? {
        calories: Math.round(selectedFood.calories * grams / 100),
        protein: Math.round(selectedFood.protein * grams / 100 * 10) / 10,
        carbs: Math.round(selectedFood.carbs * grams / 100 * 10) / 10,
        fat: Math.round(selectedFood.fat * grams / 100 * 10) / 10,
    } : null;

    return (
        <div className="animate-fade-in">
            <div className="mb-8">
                <h1 className="page-title">Track Your Macros 🍽️</h1>
                <p className="page-subtitle">Log what you eat and track your daily progress.</p>
            </div>

            {/* Date Selector */}
            <div className="card mb-6">
                <div className="flex items-center gap-4 flex-wrap">
                    <div>
                        <label className="form-label">Select Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            className="btn-secondary"
                            onClick={() => {
                                const d = new Date(selectedDate);
                                d.setDate(d.getDate() - 1);
                                setSelectedDate(d.toISOString().split('T')[0]);
                            }}
                        >
                            ← Previous
                        </button>
                        <button
                            className="btn-secondary"
                            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                        >
                            Today
                        </button>
                        <button
                            className="btn-secondary"
                            onClick={() => {
                                const d = new Date(selectedDate);
                                d.setDate(d.getDate() + 1);
                                setSelectedDate(d.toISOString().split('T')[0]);
                            }}
                        >
                            Next →
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="stat-card">
                    <div className="text-4xl mb-2">🔥</div>
                    <div className="stat-value">{Math.round(totals.calories)}</div>
                    <div className="stat-label">Calories</div>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{
                                width: `${Math.min((totals.calories / targets.calories) * 100, 100)}%`,
                                background: 'var(--calories)'
                            }}
                        />
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {targets.calories - Math.round(totals.calories)} remaining
                    </div>
                </div>
                <div className="stat-card">
                    <div className="text-4xl mb-2">💪</div>
                    <div className="stat-value">{Math.round(totals.protein)}g</div>
                    <div className="stat-label">Protein</div>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{
                                width: `${Math.min((totals.protein / targets.protein) * 100, 100)}%`,
                                background: 'var(--protein)'
                            }}
                        />
                    </div>
                </div>
                <div className="stat-card">
                    <div className="text-4xl mb-2">🍚</div>
                    <div className="stat-value">{Math.round(totals.carbs)}g</div>
                    <div className="stat-label">Carbs</div>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{
                                width: `${Math.min((totals.carbs / targets.carbs) * 100, 100)}%`,
                                background: 'var(--carbs)'
                            }}
                        />
                    </div>
                </div>
                <div className="stat-card">
                    <div className="text-4xl mb-2">🥑</div>
                    <div className="stat-value">{Math.round(totals.fat)}g</div>
                    <div className="stat-label">Fat</div>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{
                                width: `${Math.min((totals.fat / targets.fat) * 100, 100)}%`,
                                background: 'var(--fat)'
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Add Food Form */}
                <div className="card">
                    <h3 className="font-semibold mb-4">Add Food</h3>

                    <div className="space-y-4">
                        {/* Search */}
                        <div className="relative">
                            <label className="form-label">Search Food</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Search chicken, rice, eggs..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setSelectedFood(null);
                                }}
                            />

                            {searchResults.length > 0 && !selectedFood && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg max-h-60 overflow-y-auto z-10">
                                    {searchResults.map((food) => (
                                        <button
                                            key={food.id}
                                            onClick={() => selectFood(food)}
                                            className="w-full text-left px-4 py-2 hover:bg-gray-800"
                                        >
                                            <div className="font-medium">{food.name}</div>
                                            <div className="text-xs text-gray-500">
                                                {food.calories} kcal | {food.protein}g P | {food.carbs}g C | {food.fat}g F (per 100g)
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Grams</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={grams}
                                    onChange={(e) => setGrams(parseInt(e.target.value) || 0)}
                                    min="1"
                                />
                            </div>
                            <div>
                                <label className="form-label">Meal Type</label>
                                <select
                                    className="form-input"
                                    value={mealType}
                                    onChange={(e) => setMealType(e.target.value as 'main' | 'snack')}
                                >
                                    <option value="main">Main Meal</option>
                                    <option value="snack">Snack</option>
                                </select>
                            </div>
                        </div>

                        {/* Preview */}
                        {preview && selectedFood && (
                            <div className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                <div className="flex justify-between items-center mb-2">
                                    <strong>{selectedFood.name}</strong>
                                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{grams}g</span>
                                </div>
                                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                                    <div>
                                        <span style={{ color: 'var(--calories)' }}>{preview.calories}</span> kcal
                                    </div>
                                    <div>
                                        <span style={{ color: 'var(--protein)' }}>{preview.protein}</span>g P
                                    </div>
                                    <div>
                                        <span style={{ color: 'var(--carbs)' }}>{preview.carbs}</span>g C
                                    </div>
                                    <div>
                                        <span style={{ color: 'var(--fat)' }}>{preview.fat}</span>g F
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={addToLog}
                            className="btn-primary w-full"
                            disabled={!selectedFood}
                        >
                            ➕ Add to Log
                        </button>
                    </div>

                    {/* Quick Add */}
                    <div className="mt-6">
                        <p className="form-label mb-2">Quick Add Common Foods</p>
                        <div className="flex flex-wrap gap-2">
                            {sampleFoods.slice(0, 6).map((food) => (
                                <button
                                    key={food.id}
                                    onClick={() => {
                                        selectFood(food);
                                        setGrams(food.name.includes('Egg') ? 100 : 200);
                                    }}
                                    className="px-3 py-1 text-sm rounded-full border border-gray-700 hover:border-gray-500"
                                >
                                    {food.name.split('(')[0].trim()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Today's Log */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Today's Log</h3>
                        <span className="badge badge-primary">{logItems.length} items</span>
                    </div>

                    {logItems.length === 0 ? (
                        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                            <div className="text-5xl mb-4">🍽️</div>
                            <p>No foods logged yet. Start adding!</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {logItems.map((item) => (
                                <div key={item.id} className="log-item">
                                    <div className="flex-1">
                                        <div className="log-item-name">{item.foodName}</div>
                                        <div className="log-item-details">{item.grams}g • {item.mealType}</div>
                                    </div>
                                    <div className="log-item-macros">
                                        <div className="log-item-macro">
                                            <div style={{ color: 'var(--calories)', fontWeight: 600 }}>{item.calories}</div>
                                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>kcal</div>
                                        </div>
                                        <div className="log-item-macro">
                                            <div style={{ color: 'var(--protein)', fontWeight: 600 }}>{item.protein}</div>
                                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>P</div>
                                        </div>
                                        <div className="log-item-macro">
                                            <div style={{ color: 'var(--carbs)', fontWeight: 600 }}>{item.carbs}</div>
                                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>C</div>
                                        </div>
                                        <div className="log-item-macro">
                                            <div style={{ color: 'var(--fat)', fontWeight: 600 }}>{item.fat}</div>
                                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>F</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeFromLog(item.id)}
                                        className="text-red-400 hover:text-red-300"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Weight Tracking */}
            <div className="card mt-6">
                <h3 className="font-semibold mb-4">Log Today's Weight (Optional)</h3>
                <div className="flex gap-4 items-end">
                    <div className="flex-1 max-w-xs">
                        <label className="form-label">Weight (kg)</label>
                        <input
                            type="number"
                            className="form-input"
                            placeholder="e.g., 114.5"
                            step="0.1"
                            value={weight || ''}
                            onChange={(e) => setWeight(parseFloat(e.target.value) || null)}
                        />
                    </div>
                    <button className="btn-secondary">
                        Save Weight
                    </button>
                </div>
            </div>
        </div>
    );
}
