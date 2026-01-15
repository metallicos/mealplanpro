'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
    Utensils, Calendar, ChevronLeft, ChevronRight, Flame,
    Dumbbell, Wheat, Droplet, Bone, Zap, Banana, Leaf as Salt,
    Shield, Camera, Search, Plus, Edit2, Trash2, X, Info,
    AlertCircle, CheckCircle, Leaf
} from 'lucide-react';

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
    minerals?: {
        calcium: number;
        iron: number;
        magnesium: number;
        potassium: number;
        sodium: number;
        zinc: number;
    };
}

interface LogItem {
    id: number;
    food_name: string;
    grams: number;
    meal_type: 'main' | 'snack';
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    minerals?: {
        calcium: number;
        iron: number;
        magnesium: number;
        potassium: number;
        sodium: number;
        zinc: number;
    };
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
    nova_group: number | null;
    nutrient_levels: Record<string, 'low' | 'moderate' | 'high'> | null;
    ingredients_text: string | null;
    quantity: string | null;
    product_quantity: number | null;
}

// Helper to check if nutrient is negative
const paramIsBadIfHigh = (key: string) => {
    const negatives = ['fat', 'salt', 'saturated-fat', 'sugars', 'sodium'];
    return negatives.includes(key);
};

export default function MacrosPage() {
    const { theme, settings } = useUser();
    // Helper to get local date string YYYY-MM-DD
    const getToday = () => {
        const d = new Date();
        return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    };

    const t = useTranslations('macros');
    const tDash = useTranslations('dashboard');
    const tCommon = useTranslations('common');
    const locale = useLocale();
    const [selectedDate, setSelectedDate] = useState(getToday());
    const [logItems, setLogItems] = useState<LogItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Ingredient[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedFood, setSelectedFood] = useState<Ingredient | null>(null);
    const [grams, setGrams] = useState(100);
    const [mealType, setMealType] = useState<'main' | 'snack'>('main');
    const [weight, setWeight] = useState<number | null>(null);

    // Barcode scanner state (URL synced)
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Derive scanner state from URL
    const showScanner = searchParams.get('scanner') === 'true';

    const setShowScanner = (visible: boolean) => {
        const params = new URLSearchParams(searchParams.toString());
        if (visible) {
            params.set('scanner', 'true');
            router.push(`${pathname}?${params.toString()}`);
        } else {
            params.delete('scanner');
            // Use replace instead of push when closing to avoid building history stack? 
            // User wants "back" to close it. If we use push(open), then back() will go to previous URL (closed).
            // So closing manually normally just goes back?
            // If I manually click "X", I should probably router.back() if possible, or replace url.
            // But if I replace URL, then 'forward' button might open logic.
            // Simplest: just remove param.
            // Wait, if user clicked "back" browser button, the param is removed automatically.
            // If user clicks "X", we want to remove param.
            router.push(`${pathname}?${params.toString()}`);
        }
    };

    const [scannedFood, setScannedFood] = useState<ScannedFood | null>(null);
    const [scannedGrams, setScannedGrams] = useState(100);
    const [scannedUnit, setScannedUnit] = useState('g');
    const [showNovaInfo, setShowNovaInfo] = useState(false);

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
        minerals: {
            calcium: (acc.minerals?.calcium || 0) + (item.minerals?.calcium || 0),
            iron: (acc.minerals?.iron || 0) + (item.minerals?.iron || 0),
            magnesium: (acc.minerals?.magnesium || 0) + (item.minerals?.magnesium || 0),
            potassium: (acc.minerals?.potassium || 0) + (item.minerals?.potassium || 0),
            sodium: (acc.minerals?.sodium || 0) + (item.minerals?.sodium || 0),
            zinc: (acc.minerals?.zinc || 0) + (item.minerals?.zinc || 0),
        }
    }), {
        calories: 0, protein: 0, carbs: 0, fat: 0,
        minerals: { calcium: 0, iron: 0, magnesium: 0, potassium: 0, sodium: 0, zinc: 0 }
    });

    // Fetch logs on date change
    useEffect(() => {
        fetch(`/api/logs?date=${selectedDate}`)
            .then(res => res.json())
            .then(data => setLogItems(data.logs || []))
            .catch(err => console.error(err));
    }, [selectedDate]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.length >= 2) {
                setIsSearching(true);
                fetch(`/api/ingredients/search?q=${encodeURIComponent(searchQuery)}&lang=${tCommon('lang') || 'en'}`)
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

    // ... (Search logic remains same)

    const selectFood = (food: Ingredient) => {
        setSelectedFood(food);
        setSearchQuery(food.name);
        setSearchResults([]);
    };

    const addToLog = async () => {
        if (!selectedFood) return;

        const multiplier = grams / 100;
        const newItem = {
            date: selectedDate,
            food_name: selectedFood.name,
            grams,
            meal_type: mealType,
            calories: Math.round(selectedFood.calories * multiplier),
            protein: Math.round(selectedFood.protein * multiplier * 10) / 10,
            carbs: Math.round(selectedFood.carbs * multiplier * 10) / 10,
            fat: Math.round(selectedFood.fat * multiplier * 10) / 10,
            minerals: selectedFood.minerals ? {
                calcium: Math.round(selectedFood.minerals.calcium * multiplier),
                iron: Math.round(selectedFood.minerals.iron * multiplier * 100) / 100,
                magnesium: Math.round(selectedFood.minerals.magnesium * multiplier),
                potassium: Math.round(selectedFood.minerals.potassium * multiplier),
                sodium: Math.round(selectedFood.minerals.sodium * multiplier),
                zinc: Math.round(selectedFood.minerals.zinc * multiplier * 100) / 100,
            } : undefined
        };

        try {
            const res = await fetch('/api/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem)
            });
            const data = await res.json();

            if (res.ok) {
                setLogItems([...logItems, { ...newItem, id: data.id } as LogItem]);
                setSearchQuery('');
                setSelectedFood(null);
                setGrams(100);
            }
        } catch (err) {
            console.error('Failed to log food', err);
            alert('Failed to save log');
        }
    };

    const removeFromLog = async (id: number) => {
        try {
            await fetch(`/api/logs?id=${id}`, { method: 'DELETE' });
            setLogItems(logItems.filter(i => i.id !== id));
        } catch (err) { console.error(err); }
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

        // Smart Serving & Unit Logic
        let defaultGrams = 100; // Default fallback
        let detectedUnit = 'g';

        // Helper to extract unit
        const extractUnit = (str: string) => {
            const match = str.toLowerCase().match(/[0-9]+(\.[0-9]+)?\s*(ml|cl|dl|l|g|kg)/);
            if (match) return match[2];
            return null;
        };

        const getMultiplier = (u: string) => {
            switch (u) {
                case 'cl': return 10;
                case 'dl': return 100;
                case 'l': return 1000;
                case 'kg': return 1000;
                default: return 1;
            }
        };

        // 1. Try explicit serving size
        if (food.serving_size) {
            const match = food.serving_size.match(/(\d+(\.\d+)?)/);
            if (match) {
                const val = parseFloat(match[0]);
                const unit = extractUnit(food.serving_size);
                if (unit) {
                    detectedUnit = unit;
                    defaultGrams = val * getMultiplier(unit);
                } else {
                    defaultGrams = val;
                }
            }
        }
        // 2. Fallback to numeric product quantity (e.g. 500 from API)
        else if (food.product_quantity) {
            defaultGrams = food.product_quantity;
            // Usually if product_quantity is present, unit might be in quantity string
            if (food.quantity) {
                const unit = extractUnit(food.quantity);
                if (unit) detectedUnit = unit;
            }
        }
        // 3. Fallback to string quantity (e.g. "500ml")
        else if (food.quantity) {
            const match = food.quantity.match(/(\d+(\.\d+)?)/);
            if (match) {
                const val = parseFloat(match[0]);
                const unit = extractUnit(food.quantity);
                if (unit) {
                    detectedUnit = unit;
                    defaultGrams = val * getMultiplier(unit);
                } else {
                    defaultGrams = val;
                }
            }
        }

        setScannedGrams(defaultGrams);
        setScannedUnit(detectedUnit);
        setShowScanner(false);
    };

    // Add scanned food to log
    const addScannedToLog = async () => {
        if (!scannedFood) return;

        const multiplier = scannedGrams / 100;
        const newItem = {
            date: selectedDate,
            food_name: scannedFood.brand
                ? `${scannedFood.name} (${scannedFood.brand})`
                : scannedFood.name,
            grams: scannedGrams,
            meal_type: mealType,
            calories: Math.round(scannedFood.calories_per_100g * multiplier),
            protein: Math.round(scannedFood.protein_per_100g * multiplier * 10) / 10,
            carbs: Math.round(scannedFood.carbs_per_100g * multiplier * 10) / 10,
            fat: Math.round(scannedFood.fat_per_100g * multiplier * 10) / 10,
        };

        try {
            const res = await fetch('/api/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem)
            });
            const data = await res.json();

            if (res.ok) {
                setLogItems([...logItems, { ...newItem, id: data.id } as LogItem]);
                setScannedFood(null);
                setScannedGrams(100);
            }
        } catch (err) {
            console.error('Failed to log scanned food', err);
            alert('Failed to save log');
        }
    };

    const scannedPreview = scannedFood ? {
        calories: Math.round(scannedFood.calories_per_100g * scannedGrams / 100),
        protein: Math.round(scannedFood.protein_per_100g * scannedGrams / 100 * 10) / 10,
        carbs: Math.round(scannedFood.carbs_per_100g * scannedGrams / 100 * 10) / 10,
        fat: Math.round(scannedFood.fat_per_100g * scannedGrams / 100 * 10) / 10,
    } : null;

    // State for editing
    const [editingLog, setEditingLog] = useState<LogItem | null>(null);
    const [editGrams, setEditGrams] = useState(100);
    const [editMealType, setEditMealType] = useState<'main' | 'snack'>('main');

    const startEdit = (item: LogItem) => {
        setEditingLog(item);
        setEditGrams(item.grams);
        setEditMealType(item.meal_type);
    };

    const updateLog = async () => {
        if (!editingLog) return;

        // Calculate base values (per 1g) from the original entry
        // We assume the stored values are accurate for the stored grams
        const multiplier = editGrams / editingLog.grams;

        const updatedItem = {
            ...editingLog,
            grams: editGrams,
            meal_type: editMealType,
            calories: Math.round(editingLog.calories * multiplier),
            protein: Math.round(editingLog.protein * multiplier * 10) / 10,
            carbs: Math.round(editingLog.carbs * multiplier * 10) / 10,
            fat: Math.round(editingLog.fat * multiplier * 10) / 10,
            minerals: editingLog.minerals ? {
                calcium: Math.round(editingLog.minerals.calcium * multiplier),
                iron: Math.round(editingLog.minerals.iron * multiplier * 100) / 100,
                magnesium: Math.round(editingLog.minerals.magnesium * multiplier),
                potassium: Math.round(editingLog.minerals.potassium * multiplier),
                sodium: Math.round(editingLog.minerals.sodium * multiplier),
                zinc: Math.round(editingLog.minerals.zinc * multiplier * 100) / 100,
            } : undefined
        };

        try {
            const res = await fetch('/api/logs', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedItem)
            });

            if (res.ok) {
                setLogItems(logItems.map(i => i.id === editingLog.id ? updatedItem : i));
                setEditingLog(null);
            } else {
                alert('Failed to update log');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to update log');
        }
    };

    return (
        <>
            <div className="animate-fade-in">
                <div className="mb-8">
                    <h1 className="page-title flex items-center gap-3"><Utensils className="w-8 h-8 text-[var(--accent-primary)]" /> {t('title')}</h1>
                    <p className="page-subtitle">{t('subtitle')}</p>
                </div>

                {/* Date Selector */}
                <div className="card mb-6">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div>
                            <label className="form-label">{t('selectDate')}</label>
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
                                    // Ensure we format back to YYYY-MM-DD properly
                                    const prev = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                                    setSelectedDate(prev);
                                }}
                            >
                                <ChevronLeft className="w-4 h-4" /> {t('previous')}
                            </button>
                            <button
                                className="btn-secondary"
                                onClick={() => setSelectedDate(getToday())}
                            >
                                {tCommon('today')}
                            </button>
                            <button
                                className="btn-secondary"
                                onClick={() => {
                                    const d = new Date(selectedDate);
                                    d.setDate(d.getDate() + 1);
                                    const next = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                                    setSelectedDate(next);
                                }}
                            >
                                {t('next')} <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="stat-card">
                        <div className="text-4xl mb-2 flex justify-center"><Flame className="w-8 h-8 text-[var(--calories)]" /></div>
                        <div className="stat-value">{Math.round(totals.calories)}</div>
                        <div className="stat-label">{t('calories')}</div>
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
                            {targets.calories - Math.round(totals.calories)} {t('remaining')}
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="text-4xl mb-2 flex justify-center"><Dumbbell className="w-8 h-8 text-[var(--protein)]" /></div>
                        <div className="stat-value">{Math.round(totals.protein)}g</div>
                        <div className="stat-label">{t('protein')}</div>
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
                        <div className="text-4xl mb-2 flex justify-center"><Wheat className="w-8 h-8 text-[var(--carbs)]" /></div>
                        <div className="stat-value">{Math.round(totals.carbs)}g</div>
                        <div className="stat-label">{t('carbs')}</div>
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
                        <div className="text-4xl mb-2 flex justify-center"><Droplet className="w-8 h-8 text-[var(--fat)]" /></div>
                        <div className="stat-value">{Math.round(totals.fat)}g</div>
                        <div className="stat-label">{t('fat')}</div>
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

                {/* Minerals */}
                <div className="card mb-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400" /> {t('micronutrients')}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="text-center p-2 rounded bg-gray-800/50">
                            <div className="text-xl flex justify-center mb-1"><Bone className="w-6 h-6 text-white" /></div>
                            <div className="font-bold text-lg">{Math.round(totals.minerals.calcium)}mg</div>
                            <div className="text-xs text-gray-400">{t('calcium')}</div>
                        </div>
                        <div className="text-center p-2 rounded bg-gray-800/50">
                            <div className="text-xl flex justify-center mb-1"><Droplet className="w-6 h-6 text-red-500" /></div>
                            <div className="font-bold text-lg">{totals.minerals.iron.toFixed(1)}mg</div>
                            <div className="text-xs text-gray-400">{t('iron')}</div>
                        </div>
                        <div className="text-center p-2 rounded bg-gray-800/50">
                            <div className="text-xl flex justify-center mb-1"><Zap className="w-6 h-6 text-yellow-500" /></div>
                            <div className="font-bold text-lg">{Math.round(totals.minerals.magnesium)}mg</div>
                            <div className="text-xs text-gray-400">{t('magnesium')}</div>
                        </div>
                        <div className="text-center p-2 rounded bg-gray-800/50">
                            <div className="text-xl flex justify-center mb-1"><Banana className="w-6 h-6 text-yellow-300" /></div>
                            <div className="font-bold text-lg">{Math.round(totals.minerals.potassium)}mg</div>
                            <div className="text-xs text-gray-400">{t('potassium')}</div>
                        </div>
                        <div className="text-center p-2 rounded bg-gray-800/50">
                            <div className="text-xl flex justify-center mb-1"><Salt className="w-6 h-6 text-white" /></div>
                            <div className="font-bold text-lg">{Math.round(totals.minerals.sodium)}mg</div>
                            <div className="text-xs text-gray-400">{t('sodium')}</div>
                        </div>
                        <div className="text-center p-2 rounded bg-gray-800/50">
                            <div className="text-xl flex justify-center mb-1"><Shield className="w-6 h-6 text-gray-400" /></div>
                            <div className="font-bold text-lg">{totals.minerals.zinc.toFixed(1)}mg</div>
                            <div className="text-xs text-gray-400">{t('zinc')}</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Add Food Form */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">{t('addFood')}</h3>
                            <button
                                onClick={() => setShowScanner(true)}
                                className="btn-primary text-sm flex items-center gap-2"
                            >
                                <Camera className="w-4 h-4" /> {t('scanBarcode')}
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Search */}
                            <div className="relative">
                                <label className="form-label">{t('searchFood')}</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder={t('searchFood_placeholder')}
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setSelectedFood(null);
                                    }}
                                />

                                {searchResults.length > 0 && !selectedFood && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg max-h-60 overflow-y-auto z-10 shadow-xl">
                                        {isSearching && <div className="p-2 text-sm text-gray-500">{t('searching')}</div>}
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
                                    <label className="form-label">{t('grams')}</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={grams}
                                        onChange={(e) => setGrams(parseInt(e.target.value) || 0)}
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="form-label">{t('mealType')}</label>
                                    <select
                                        className="form-input"
                                        value={mealType}
                                        onChange={(e) => setMealType(e.target.value as 'main' | 'snack')}
                                    >
                                        <option value="main">{t('mainMeal')}</option>
                                        <option value="snack">{t('snack')}</option>
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
                                className="btn-primary w-full flex items-center justify-center gap-2"
                                disabled={!selectedFood}
                            >
                                <Plus className="w-5 h-5" /> {t('addToLog')}
                            </button>
                        </div>

                        {/* Quick Add Removed - Use Search */}
                        <div className="mt-4 text-xs text-gray-500 text-center">
                            {t('searchHint')}
                        </div>
                    </div>

                    {/* Today's Log */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">{t('todayLog')}</h3>
                            <span className="badge badge-primary">{logItems.length} items</span>
                        </div>

                        {logItems.length === 0 ? (
                            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                                <div className="text-5xl mb-4 flex justify-center"><Utensils className="w-16 h-16 opacity-50" /></div>
                                <p>{t('noFoodsLogged')}</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {logItems.map((item) => (
                                    <div key={item.id} className="log-item group relative">
                                        <div className="flex-1">
                                            <div className="log-item-name">{item.food_name}</div>
                                            <div className="log-item-details">{item.grams}g • {item.meal_type}</div>
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

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => startEdit(item)}
                                                className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => removeFromLog(item.id)}
                                                className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-white/10"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Weight Tracking */}
                <div className="card mt-6">
                    <h3 className="font-semibold mb-4">{t('logWeightTitle')}</h3>
                    <div className="flex gap-4 items-end">
                        <div className="flex-1 max-w-xs">
                            <label className="form-label">Weight (kg)</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder={t('weightPlaceholder')}
                                step="0.1"
                                value={weight || ''}
                                onChange={(e) => setWeight(parseFloat(e.target.value) || null)}
                            />
                        </div>
                        <button className="btn-secondary">
                            {t('saveWeight')}
                        </button>
                    </div>
                </div>
                {/* Barcode Scanner Modal */}
                {showScanner && (
                    <Suspense fallback={
                        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
                            <div className="text-white text-center">
                                <div className="text-4xl mb-4 flex justify-center"><Camera className="w-12 h-12 w-12 h-12 animate-pulse" /></div>
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
                    <div className="fixed inset-0 bg-[#0a0a0f] z-[60] flex flex-col animate-fade-in overflow-y-auto">
                        {/* Full Screen Header */}
                        <div className="flex-none p-4 pb-2 flex items-center justify-between border-b border-white/5 sticky top-0 bg-[#0a0a0f]/95 backdrop-blur-md z-10">
                            <button
                                onClick={() => setScannedFood(null)}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors text-2xl"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-white leading-tight line-clamp-1 max-w-[200px] mx-auto">{scannedFood.name}</h3>
                                {scannedFood.brand && (
                                    <p className="text-xs text-gray-400">{scannedFood.brand}</p>
                                )}
                            </div>
                            <div className="w-10"></div> {/* Spacer for centering */}
                        </div>

                        <div className="flex-1 p-6 flex flex-col max-w-lg mx-auto w-full">
                            {/* Product Image */}
                            {scannedFood.image_url && (
                                <div className="flex justify-center mb-6">
                                    <div
                                        className="h-40 w-40 rounded-full bg-cover bg-center border-4 border-white/5 shadow-2xl"
                                        style={{ backgroundImage: `url(${scannedFood.image_url})` }}
                                    />
                                </div>
                            )}

                            {/* Nutrition Grid */}
                            <div className="grid grid-cols-4 gap-2 text-center p-4 rounded-2xl mb-8 bg-white/5 border border-white/5">
                                <div>
                                    <div className="text-2xl font-bold" style={{ color: '#ef4444' }}>
                                        {Math.round(scannedFood.calories_per_100g * (scannedGrams / 100))}
                                    </div>
                                    <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">kcal</div>
                                </div>
                                <div>
                                    <div className="text-xl font-bold" style={{ color: '#3b82f6' }}>
                                        {Math.round(scannedFood.protein_per_100g * (scannedGrams / 100))}<span className="text-sm">g</span>
                                    </div>
                                    <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Prot</div>
                                </div>
                                <div>
                                    <div className="text-xl font-bold" style={{ color: '#f59e0b' }}>
                                        {Math.round(scannedFood.carbs_per_100g * (scannedGrams / 100))}<span className="text-sm">g</span>
                                    </div>
                                    <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Carbs</div>
                                </div>
                                <div>
                                    <div className="text-xl font-bold" style={{ color: '#a855f7' }}>
                                        {Math.round(scannedFood.fat_per_100g * (scannedGrams / 100))}<span className="text-sm">g</span>
                                    </div>
                                    <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Fat</div>
                                </div>
                            </div>

                            {/* Quantity Input Section */}
                            <div className="bg-white/5 rounded-2xl p-4 mb-6">
                                <label className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3 block text-center">
                                    {t('portionSize')}
                                </label>

                                {/* Unit Toggle */}
                                <div className="flex bg-black/40 p-1 rounded-xl mb-4">
                                    <button
                                        onClick={() => {
                                            // Serving logic: parse serving_size string "30 g" -> 30, or default 100
                                            if (scannedFood.serving_size) {
                                                const match = scannedFood.serving_size.match(/(\d+(\.\d+)?)/);
                                                if (match) setScannedGrams(parseFloat(match[0]));
                                            }
                                        }}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${(scannedFood.serving_size && scannedGrams === parseFloat(scannedFood.serving_size.match(/(\d+(\.\d+)?)/)?.[0] || '0'))
                                            ? 'bg-cyan-600 text-white shadow-lg'
                                            : 'text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        1 Serving ({scannedFood.serving_size || t('unknown')})
                                    </button>
                                    <button
                                        onClick={() => setScannedGrams(100)} // Reset to 100g base for custom entry
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${(!scannedFood.serving_size || scannedGrams !== parseFloat(scannedFood.serving_size.match(/(\d+(\.\d+)?)/)?.[0] || '0'))
                                            ? 'bg-cyan-600 text-white shadow-lg'
                                            : 'text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        {t('custom')} ({scannedUnit})
                                    </button>
                                </div>

                                <div className="relative">
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        className="w-full bg-black/40 border-2 border-transparent focus:border-cyan-500 rounded-xl px-4 py-4 text-center text-3xl font-bold text-white outline-none transition-all placeholder-gray-600"
                                        value={scannedGrams || ''}
                                        onChange={(e) => setScannedGrams(parseFloat(e.target.value) || 0)}
                                        placeholder="0"
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 font-bold">{scannedUnit}</span>
                                </div>
                            </div>

                            {/* Add Button */}
                            <div className="mt-8 bg-white/5 rounded-2xl p-4">
                                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Info className="w-4 h-4" /> Product Analysis
                                </h4>

                                {/* Quality Badges */}
                                <div className="flex gap-4 mb-6">
                                    {scannedFood.nutriscore && (
                                        <div className="flex-1 bg-black/40 rounded-xl p-3 flex flex-col items-center justify-center">
                                            <div className="text-xs text-gray-500 mb-1">Nutri-Score</div>
                                            <div className={`text-2xl font-black ${['a', 'b'].includes(scannedFood.nutriscore.toLowerCase()) ? 'text-green-500' :
                                                scannedFood.nutriscore.toLowerCase() === 'c' ? 'text-yellow-500' :
                                                    'text-red-500'
                                                }`}>
                                                {scannedFood.nutriscore.toUpperCase()}
                                            </div>
                                        </div>
                                    )}
                                    {scannedFood.nova_group && (
                                        <div className="flex-1 bg-black/40 rounded-xl p-3 flex flex-col items-center justify-center">
                                            <div className="text-xs text-gray-500 mb-1">NOVA</div>
                                            <div className={`text-2xl font-black ${scannedFood.nova_group === 1 ? 'text-green-500' :
                                                scannedFood.nova_group === 2 ? 'text-yellow-500' :
                                                    scannedFood.nova_group === 3 ? 'text-orange-500' : 'text-red-500'
                                                }`}>
                                                {scannedFood.nova_group}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Detailed Analysis */}
                                {scannedFood.nutrient_levels && (
                                    <div className="space-y-2 mb-6">
                                        {Object.entries(scannedFood.nutrient_levels).map(([key, level]) => {
                                            const isHigh = level === 'high';
                                            const isLow = level === 'low';
                                            // Skip moderate for brevity if needed, or show all
                                            if (level === 'moderate') return null;

                                            return (
                                                <div key={key} className="flex items-center gap-3 p-2 rounded-lg bg-black/20">
                                                    {isHigh ? (
                                                        paramIsBadIfHigh(key) ? <AlertCircle className="w-5 h-5 text-red-500" /> : <CheckCircle className="w-5 h-5 text-green-500" />
                                                    ) : (
                                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                                    )}
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium capitalize text-gray-200">
                                                            {key.replace('-', ' ')}
                                                        </div>
                                                        <div className={`text-xs ${isHigh && paramIsBadIfHigh(key) ? 'text-red-400' : 'text-gray-500'}`}>
                                                            {level.toUpperCase()}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Ingredients */}
                                {scannedFood.ingredients_text && (
                                    <div>
                                        <div className="text-xs text-gray-500 mb-2">INGREDIENTS</div>
                                        <p className="text-sm text-gray-300 leading-relaxed text-justify text-[13px]">
                                            {scannedFood.ingredients_text}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Add Button Sticky at Bottom */}
                            <div className="sticky bottom-0 pt-4 bg-gradient-to-t from-[#0a0a0f] to-transparent pb-safe-area-inset-bottom">
                                <button
                                    onClick={addScannedToLog}
                                    disabled={!scannedGrams || scannedGrams <= 0}
                                    className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-bold text-lg text-white shadow-lg shadow-cyan-900/40 disabled:opacity-50 disabled:grayscale transition-all active:scale-[0.98]"
                                >
                                    {t('addToLog')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Log Modal */}
                {
                    editingLog && (
                        <div
                            className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4 animate-fade-in"
                            onClick={() => setEditingLog(null)}
                        >
                            <div
                                className="card w-full sm:max-w-sm max-h-[85dvh] overflow-y-auto border-t border-white/10 shadow-2xl bg-[#181824] rounded-t-2xl sm:rounded-xl animate-slide-up-mobile"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-white mb-6">{t('editLogEntry')}</h3>

                                    <div className="mb-4">
                                        <div className="text-white font-medium mb-1">{editingLog.food_name}</div>
                                        <div className="text-sm text-gray-400">{t('editLogHint')}</div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div>
                                            <label className="text-xs font-semibold text-gray-400 mb-1.5 block">{t('servingSize')} (g)</label>
                                            <input
                                                type="number"
                                                className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                                value={editGrams}
                                                onChange={(e) => setEditGrams(parseInt(e.target.value) || 0)}
                                                min="1"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-gray-400 mb-1.5 block">{t('mealType')}</label>
                                            <select
                                                className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all appearance-none"
                                                value={editMealType}
                                                onChange={(e) => setEditMealType(e.target.value as 'main' | 'snack')}
                                            >
                                                <option value="main">{t('mainMeal')}</option>
                                                <option value="snack">{t('snack')}</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => setEditingLog(null)}
                                            className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium transition-colors"
                                        >
                                            {tCommon('cancel')}
                                        </button>
                                        <button
                                            onClick={updateLog}
                                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white font-bold shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
                                        >
                                            {tCommon('save')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >

            {/* Barcode Scanner Modal - Outside animation container for fixed positioning */}
            {
                showScanner && (
                    <Suspense fallback={
                        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
                            <div className="text-white text-center">
                                <div className="text-4xl mb-4 flex justify-center"><Camera className="w-12 h-12 w-12 h-12 animate-pulse" /></div>
                                <p>Loading camera...</p>
                            </div>
                        </div>
                    }>
                        <BarcodeScanner
                            onScanResult={handleScanResult}
                            onClose={() => setShowScanner(false)}
                        />
                    </Suspense>
                )
            }

            {/* Scanned Food Result Modal */}
            {
                scannedFood && (
                    <div className="fixed inset-0 z-[9999] overflow-y-auto overflow-x-hidden">
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-xl animate-fade-in"
                            onClick={() => setScannedFood(null)}
                        />

                        {/* Scrollable Content Wrapper */}
                        <div className="min-h-full flex items-center justify-center p-4 pt-20 sm:pt-4 pointer-events-none">
                            {/* Modal Card */}
                            <div className="relative w-full max-w-md bg-[#181824]/90 border border-white/10 shadow-2xl rounded-3xl overflow-hidden animate-scale-up pointer-events-auto">
                                {/* Header Image Background */}
                                <div className="relative h-48 bg-gradient-to-b from-gray-800 to-[#181824] flex items-center justify-center overflow-hidden">
                                    {scannedFood!.image_url ? (
                                        <>
                                            <div
                                                className="absolute inset-0 bg-cover bg-center opacity-30 blur-md"
                                                style={{ backgroundImage: `url(${scannedFood!.image_url})` }}
                                            />
                                            <div
                                                className="relative z-10 w-32 h-32 rounded-full border-4 border-[#181824] shadow-lg bg-cover bg-center"
                                                style={{ backgroundImage: `url(${scannedFood!.image_url})` }}
                                            />
                                        </>
                                    ) : (
                                        <Utensils className="w-16 h-16 text-gray-600" />
                                    )}
                                    <button
                                        onClick={() => setScannedFood(null)}
                                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-colors z-20"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="p-6 flex-1 overflow-y-auto">
                                    <div className="text-center mb-6">
                                        <h3 className="text-2xl font-bold text-white mb-1 leading-tight">{scannedFood!.name}</h3>
                                        {scannedFood!.brand && (
                                            <p className="text-sm text-gray-400 font-medium tracking-wide uppercase">{scannedFood!.brand}</p>
                                        )}
                                        <div className="mt-2 text-xs font-mono text-gray-500 bg-white/5 py-1 px-3 rounded-full inline-block">
                                            {scannedFood!.quantity || '100g base'}
                                        </div>
                                    </div>

                                    {/* Quality Badges Grid */}
                                    <div className="grid grid-cols-2 gap-3 mb-8">
                                        {scannedFood!.nutriscore && (
                                            <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center justify-center border border-white/5">
                                                <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Nutri-Score</span>
                                                <span className={`text-2xl font-black ${['a', 'b'].includes(scannedFood!.nutriscore!.toLowerCase()) ? 'text-green-400' :
                                                    scannedFood!.nutriscore!.toLowerCase() === 'c' ? 'text-yellow-400' : 'text-red-400'
                                                    }`}>
                                                    {scannedFood!.nutriscore!.toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        {scannedFood!.nova_group && (
                                            <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center justify-center border border-white/5 relative group cursor-help" onClick={() => setShowNovaInfo(true)}>
                                                <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                    NOVA <Info className="w-3 h-3 opacity-50" />
                                                </span>
                                                <span className={`text-2xl font-black ${scannedFood!.nova_group === 1 ? 'text-green-400' :
                                                    scannedFood!.nova_group === 2 ? 'text-yellow-400' :
                                                        scannedFood!.nova_group === 3 ? 'text-orange-400' : 'text-red-400'
                                                    }`}>
                                                    {scannedFood!.nova_group}
                                                </span>
                                                <span className="text-[9px] text-gray-400 uppercase font-bold text-center mt-1 leading-tight max-w-[80%]">
                                                    {t(`nova.badge.${scannedFood!.nova_group}`)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Smart Portion Input */}
                                    <div className="bg-gradient-to-br from-white/5 to-transparent rounded-2xl p-5 mb-8 border border-white/5 relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent-primary)] opacity-50 group-hover:opacity-100 transition-opacity" />

                                        <label className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4 block text-center">
                                            {t('portionSize')}
                                        </label>

                                        <div className="flex items-center justify-center gap-4">
                                            <button
                                                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[var(--accent-primary)] transition-colors"
                                                onClick={() => setScannedGrams(Math.max(0, scannedGrams - 50))}
                                            >
                                                <span className="text-xl font-bold">-</span>
                                            </button>

                                            <div className="relative min-w-[120px]">
                                                <input
                                                    type="number"
                                                    inputMode="decimal"
                                                    className="w-full bg-transparent text-center text-4xl font-bold text-white outline-none placeholder-gray-700"
                                                    value={(() => {
                                                        const m = scannedUnit === 'cl' ? 10 : scannedUnit === 'dl' ? 100 : scannedUnit === 'l' ? 1000 : scannedUnit === 'kg' ? 1000 : 1;
                                                        return Math.round((scannedGrams / m) * 100) / 100 || '';
                                                    })()}
                                                    onChange={(e) => {
                                                        const m = scannedUnit === 'cl' ? 10 : scannedUnit === 'dl' ? 100 : scannedUnit === 'l' ? 1000 : scannedUnit === 'kg' ? 1000 : 1;
                                                        setScannedGrams((parseFloat(e.target.value) || 0) * m);
                                                    }}
                                                    placeholder="0"
                                                />
                                                <div className="text-center text-xs text-[var(--accent-primary)] font-bold mt-1 uppercase">
                                                    {/* Heuristic: display detected unit */}
                                                    {scannedUnit}
                                                </div>
                                            </div>

                                            <button
                                                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[var(--accent-primary)] transition-colors"
                                                onClick={() => setScannedGrams(scannedGrams + 50)}
                                            >
                                                <span className="text-xl font-bold">+</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Macros Summary */}
                                    <div className="grid grid-cols-4 gap-2 mb-8">
                                        {[
                                            { label: 'Kcal', val: Math.round(scannedFood!.calories_per_100g * (scannedGrams / 100)), color: '#ef4444' },
                                            { label: 'Prot', val: Math.round(scannedFood!.protein_per_100g * (scannedGrams / 100)), color: '#3b82f6' },
                                            { label: 'Carbs', val: Math.round(scannedFood!.carbs_per_100g * (scannedGrams / 100)), color: '#f59e0b' },
                                            { label: 'Fat', val: Math.round(scannedFood!.fat_per_100g * (scannedGrams / 100)), color: '#a855f7' }
                                        ].map((m, i) => (
                                            <div key={i} className="text-center p-2 rounded-lg bg-white/5">
                                                <div className="text-lg font-bold" style={{ color: m.color }}>{m.val}</div>
                                                <div className="text-[10px] text-gray-500 uppercase font-bold">{m.label}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Detailed Analysis List */}
                                    {scannedFood!.nutrient_levels && (
                                        <div className="space-y-3 mb-6">
                                            <h4 className="text-sm font-bold text-gray-300 mb-2">Analysis</h4>
                                            {Object.entries(scannedFood!.nutrient_levels!).map(([key, level]) => {
                                                if (level === 'moderate') return null; // Keep it clean
                                                const isHigh = level === 'high';
                                                const isBad = isHigh && paramIsBadIfHigh(key);

                                                return (
                                                    <div key={key} className={`flex items-center gap-3 p-3 rounded-lg border ${isBad ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
                                                        {isBad ? <AlertCircle className="w-5 h-5 text-red-400" /> : <CheckCircle className="w-5 h-5 text-green-400" />}
                                                        <div className="flex-1">
                                                            <div className="text-sm font-medium text-gray-200 capitalize">{key.replace('-', ' ')}</div>
                                                            <div className="text-xs opacity-70 uppercase tracking-wider">{level}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Sticky Footer Action */}
                                <div className="p-4 border-t border-white/5 bg-[#181824]">
                                    <button
                                        onClick={addScannedToLog}
                                        disabled={!scannedGrams || scannedGrams <= 0}
                                        className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-bold text-lg shadow-lg shadow-[var(--accent-glow)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
                                    >
                                        {t('addToLog')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* NOVA Info Modal */}
            {showNovaInfo && (
                <div
                    className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
                    onClick={() => setShowNovaInfo(false)}
                >
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" />
                    <div
                        className="relative w-full max-w-sm bg-[#181824] border border-white/10 rounded-3xl p-6 shadow-2xl animate-scale-up"
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Info className="w-5 h-5 text-gray-400" />
                            {t('nova.title')}
                        </h3>
                        <div className="space-y-3">
                            {[
                                { group: 1, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
                                { group: 2, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
                                { group: 3, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
                                { group: 4, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' }
                            ].map(nova => (
                                <div key={nova.group} className={`p-3 rounded-xl border ${nova.border} ${nova.bg}`}>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className={`text-xl font-black ${nova.color}`}>{nova.group}</span>
                                        <span className={`text-sm font-bold ${nova.color}`}>
                                            {t(`nova.groups.${nova.group}.label`)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 leading-relaxed ml-7">
                                        {t(`nova.groups.${nova.group}.desc`)}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <button
                            className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold transition-colors"
                            onClick={() => setShowNovaInfo(false)}
                        >
                            {tCommon('close')}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
