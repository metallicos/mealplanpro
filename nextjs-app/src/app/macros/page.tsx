'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { useUser } from '@/contexts/UserContext';

// Lazy load the scanner to avoid SSR issues with Quagga
const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner'));

// Sample foods (would come from API in production)
// Ingredient type from DB
interface Ingredient {
    id: number;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    category?: string;
}

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

interface ScannedFood {
    barcode: string;
    name: string;
    brand: string;
    image_url: string | null;
    serving_size: string;
    calories_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
    fiber_per_100g: number;
    nutriscore: string | null;
}

export default function MacrosPage() {
    const { theme, settings } = useUser();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [logItems, setLogItems] = useState<LogItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Ingredient[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedFood, setSelectedFood] = useState<Ingredient | null>(null);
    const [grams, setGrams] = useState(100);
    const [mealType, setMealType] = useState<'main' | 'snack'>('main');
    const [weight, setWeight] = useState<number | null>(null);

    // Barcode scanner state
    const [showScanner, setShowScanner] = useState(false);
    const [scannedFood, setScannedFood] = useState<ScannedFood | null>(null);
    const [scannedGrams, setScannedGrams] = useState(100);

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

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.length >= 2) {
                setIsSearching(true);
                fetch(`/api/ingredients/search?q=${encodeURIComponent(searchQuery)}`)
                    .then(res => res.json())
                    .then(data => {
                        setSearchResults(data.ingredients || []);
                    })
                    .catch(err => console.error('Search error:', err))
                    .finally(() => setIsSearching(false));
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const selectFood = (food: Ingredient) => {
        setSelectedFood(food);
        setSearchQuery(food.name);
        setSearchResults([]); // Hide results after selection
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

    // Handle scanned food result
    const handleScanResult = (food: ScannedFood) => {
        setScannedFood(food);
        setScannedGrams(100);
        setShowScanner(false);
    };

    // Add scanned food to log
    const addScannedToLog = () => {
        if (!scannedFood) return;

        const multiplier = scannedGrams / 100;
        const newItem: LogItem = {
            id: Date.now(),
            foodName: scannedFood.brand
                ? `${scannedFood.name} (${scannedFood.brand})`
                : scannedFood.name,
            grams: scannedGrams,
            mealType,
            calories: Math.round(scannedFood.calories_per_100g * multiplier),
            protein: Math.round(scannedFood.protein_per_100g * multiplier * 10) / 10,
            carbs: Math.round(scannedFood.carbs_per_100g * multiplier * 10) / 10,
            fat: Math.round(scannedFood.fat_per_100g * multiplier * 10) / 10,
        };

        setLogItems([...logItems, newItem]);
        setScannedFood(null);
        setScannedGrams(100);
    };

    const scannedPreview = scannedFood ? {
        calories: Math.round(scannedFood.calories_per_100g * scannedGrams / 100),
        protein: Math.round(scannedFood.protein_per_100g * scannedGrams / 100 * 10) / 10,
        carbs: Math.round(scannedFood.carbs_per_100g * scannedGrams / 100 * 10) / 10,
        fat: Math.round(scannedFood.fat_per_100g * scannedGrams / 100 * 10) / 10,
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
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Add Food</h3>
                        <button
                            onClick={() => setShowScanner(true)}
                            className="btn-primary text-sm flex items-center gap-2"
                        >
                            📷 Scan Barcode
                        </button>
                    </div>

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
                                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg max-h-60 overflow-y-auto z-10 shadow-xl">
                                    {isSearching && <div className="p-2 text-sm text-gray-500">Searching...</div>}
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
                    {/* Quick Add Removed - Use Search */}\n                    <div className="mt-4 text-xs text-gray-500 text-center">\n                        Search for any ingredient to see real macro data\n                    </div>
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
            {/* Barcode Scanner Modal */}
            {showScanner && (
                <Suspense fallback={
                    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
                        <div className="text-white text-center">
                            <div className="text-4xl mb-4">📷</div>
                            <p>Loading camera...</p>
                        </div>
                    </div>
                }>
                    <BarcodeScanner
                        onScanResult={handleScanResult}
                        onClose={() => setShowScanner(false)}
                    />
                </Suspense>
            )}

            {/* Scanned Food Result Modal */}
            {scannedFood && (
                <div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                    onClick={() => setScannedFood(null)}
                >
                    <div
                        className="card max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Product Image */}
                        {scannedFood.image_url && (
                            <div
                                className="h-40 rounded-xl mb-4 bg-cover bg-center"
                                style={{ backgroundImage: `url(${scannedFood.image_url})` }}
                            />
                        )}

                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-xl font-bold">{scannedFood.name}</h3>
                                {scannedFood.brand && (
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        {scannedFood.brand}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setScannedFood(null)}
                                className="text-2xl hover:opacity-70"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Nutri-score */}
                        {scannedFood.nutriscore && (
                            <div className="mb-4">
                                <span
                                    className="inline-block px-3 py-1 rounded-full text-sm font-bold"
                                    style={{
                                        background: scannedFood.nutriscore === 'a' ? '#16a34a' :
                                            scannedFood.nutriscore === 'b' ? '#84cc16' :
                                                scannedFood.nutriscore === 'c' ? '#facc15' :
                                                    scannedFood.nutriscore === 'd' ? '#f97316' : '#ef4444',
                                        color: 'white'
                                    }}
                                >
                                    Nutri-Score {scannedFood.nutriscore.toUpperCase()}
                                </span>
                            </div>
                        )}

                        {/* Nutrition per 100g */}
                        <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-lg mb-4" style={{ background: 'var(--bg-secondary)' }}>
                            <div>
                                <div className="font-bold" style={{ color: 'var(--calories)' }}>
                                    {Math.round(scannedFood.calories_per_100g)}
                                </div>
                                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>kcal</div>
                            </div>
                            <div>
                                <div className="font-bold" style={{ color: 'var(--protein)' }}>
                                    {Math.round(scannedFood.protein_per_100g)}g
                                </div>
                                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Protein</div>
                            </div>
                            <div>
                                <div className="font-bold" style={{ color: 'var(--carbs)' }}>
                                    {Math.round(scannedFood.carbs_per_100g)}g
                                </div>
                                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Carbs</div>
                            </div>
                            <div>
                                <div className="font-bold" style={{ color: 'var(--fat)' }}>
                                    {Math.round(scannedFood.fat_per_100g)}g
                                </div>
                                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Fat</div>
                            </div>
                        </div>

                        <p className="text-xs text-center mb-4" style={{ color: 'var(--text-muted)' }}>
                            Nutrition per 100g
                        </p>

                        {/* Serving size input */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="form-label">Serving (grams)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={scannedGrams}
                                    onChange={(e) => setScannedGrams(parseInt(e.target.value) || 0)}
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

                        {/* Preview for selected grams */}
                        {scannedPreview && (
                            <div className="p-3 rounded-lg mb-4" style={{ background: 'var(--accent-primary)', opacity: 0.1 }}>
                                <div className="text-center text-sm font-medium mb-2">
                                    For {scannedGrams}g serving:
                                </div>
                                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                                    <div>
                                        <span style={{ color: 'var(--calories)' }}>{scannedPreview.calories}</span> kcal
                                    </div>
                                    <div>
                                        <span style={{ color: 'var(--protein)' }}>{scannedPreview.protein}</span>g P
                                    </div>
                                    <div>
                                        <span style={{ color: 'var(--carbs)' }}>{scannedPreview.carbs}</span>g C
                                    </div>
                                    <div>
                                        <span style={{ color: 'var(--fat)' }}>{scannedPreview.fat}</span>g F
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setScannedFood(null)}
                                className="btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={addScannedToLog}
                                className="btn-primary flex-1"
                            >
                                ➕ Add to Log
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
