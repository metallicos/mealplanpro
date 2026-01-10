'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';
import {
    Calculator, Check, Save, Lightbulb, TrendingUp,
    Dumbbell, Wheat, Droplet, Plus, Info
} from 'lucide-react';

interface WeightLog {
    id: number;
    weekDate: string;
    weight: number;
    notes: string | null;
}

export default function CalculatorPage() {
    const { theme, user, settings, updateSettings, isSaving } = useUser();

    // Initialize form from context settings
    const [formData, setFormData] = useState({
        weight: settings.weight,
        height: settings.height,
        age: settings.age,
        gender: settings.gender,
        activity: settings.activityLevel,
        goal: settings.goal,
    });

    const [results, setResults] = useState<{
        tdee: number;
        targetCalories: number;
        protein: number;
        carbs: number;
        fat: number;
        weeklyChange: number;
    } | null>(null);

    const [saved, setSaved] = useState(false);

    // Weight tracking state
    const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
    const [newWeight, setNewWeight] = useState('');
    const [newWeightNotes, setNewWeightNotes] = useState('');
    const [isLoadingWeights, setIsLoadingWeights] = useState(true);
    const [isSavingWeight, setIsSavingWeight] = useState(false);

    // Load weight logs
    const loadWeightLogs = useCallback(async () => {
        if (!user) return;
        try {
            const response = await fetch(`/api/weight-logs?user_id=${user.id}&limit=12`);
            if (response.ok) {
                const data = await response.json();
                setWeightLogs(data);
            }
        } catch (error) {
            console.error('Failed to load weight logs:', error);
        } finally {
            setIsLoadingWeights(false);
        }
    }, [user]);

    // Update form when settings change
    useEffect(() => {
        // Only update if settings are actually different from current form to avoid overwrite loops if we want bidirectional
        // But here we basically want to load settings into form initially or if they change externally.
        // We do NOT want to reset results or saved status just because settings updated (e.g. after save!)
        setFormData(prev => ({
            ...prev,
            weight: settings.weight || prev.weight,
            height: settings.height || prev.height,
            age: settings.age || prev.age,
            gender: settings.gender || prev.gender,
            activity: settings.activityLevel || prev.activity,
            goal: settings.goal || prev.goal,
        }));

        // Don't reset results or saved status here because saveToProfile updates settings
        // which triggers this effect, causing the UI to "flash" and reset.
        setIsLoadingWeights(true);
        loadWeightLogs();
    }, [settings, loadWeightLogs]);

    // Get current week's Monday
    const getCurrentWeekDate = () => {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diff));
        return monday.toISOString().split('T')[0];
    };

    // Add weight log
    const addWeightLog = async () => {
        if (!newWeight || !user) return;

        setIsSavingWeight(true);
        try {
            await fetch('/api/weight-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    week_date: getCurrentWeekDate(),
                    weight: parseFloat(newWeight),
                    notes: newWeightNotes || null,
                }),
            });
            setNewWeight('');
            setNewWeightNotes('');
            await loadWeightLogs();
        } catch (error) {
            console.error('Failed to save weight:', error);
        } finally {
            setIsSavingWeight(false);
        }
    };

    const calculateTDEE = () => {
        const { weight, height, age, gender, activity, goal } = formData;

        // Mifflin-St Jeor Formula
        let bmr;
        if (gender === 'male') {
            bmr = 10 * weight + 6.25 * height - 5 * age + 5;
        } else {
            bmr = 10 * weight + 6.25 * height - 5 * age - 161;
        }

        // Activity multipliers
        const activityMultipliers: Record<string, number> = {
            sedentary: 1.2,
            light: 1.375,
            moderate: 1.55,
            active: 1.725,
            very_active: 1.9,
        };

        const tdee = Math.round(bmr * (activityMultipliers[activity] || 1.2));

        // Goal Rules based on scientific spec
        // Maintenance: TDEE
        // Mild Loss: -500kcal (-0.5kg/wk)
        // Aggressive Loss: -1000kcal (-1.0kg/wk)
        // Lean Gain: +300kcal (+0.3kg/wk)
        // Muscle Gain: +500kcal (+0.5kg/wk)

        let adjustment = 0;
        let weeklyChange = 0;

        switch (goal) {
            case 'aggressive_loss':
                adjustment = -1000;
                weeklyChange = -1.0;
                break;
            case 'fat_loss': // Mild loss
                adjustment = -500;
                weeklyChange = -0.5;
                break;
            case 'slow_loss': // Very mild
                adjustment = -250;
                weeklyChange = -0.25;
                break;
            case 'maintain':
                adjustment = 0;
                weeklyChange = 0;
                break;
            case 'lean_gain':
                adjustment = 300;
                weeklyChange = 0.3;
                break;
            case 'muscle_gain':
                adjustment = 500;
                weeklyChange = 0.5;
                break;
            default:
                adjustment = 0;
                weeklyChange = 0;
        }

        const targetCalories = Math.max(1200, Math.round(tdee + adjustment)); // Safety floor

        // Calculate macros based on scientific spec
        // Start with optimal (2.0g/kg Prot, 0.8g/kg Fat). 
        // If carbs < 30g, progressively lower towards scientific minimums (1.6g Prot, 0.6g Fat)

        let pRatio = 2.0;
        let fRatio = 0.8;
        const minCarbsGrams = 30; // Safety floor

        // Strategies: Optimal -> Reduced Fat -> Reduced Protein -> Min Both
        const strategies = [
            { p: 2.0, f: 0.8 },
            { p: 2.0, f: 0.7 },
            { p: 1.8, f: 0.7 },
            { p: 1.8, f: 0.6 },
            { p: 1.6, f: 0.6 }
        ];

        let bestStrategy = strategies[0];

        for (const s of strategies) {
            const p = Math.round(weight * s.p);
            const f = Math.round(weight * s.f);
            const used = (p * 4) + (f * 9);
            const rem = targetCalories - used;
            const c = Math.max(0, Math.round(rem / 4));

            if (c >= minCarbsGrams) {
                bestStrategy = s;
                break;
            }
            bestStrategy = s;
        }

        const protein = Math.round(weight * bestStrategy.p);
        const fat = Math.round(weight * bestStrategy.f);

        const proteinCals = protein * 4;
        const fatCals = fat * 9;
        const remainingCals = targetCalories - proteinCals - fatCals;
        const carbs = Math.round(Math.max(0, remainingCals) / 4);

        setResults({ tdee, targetCalories, protein, carbs, fat, weeklyChange });
        setSaved(false);
    };

    const saveToProfile = () => {
        if (!results) return;

        updateSettings({
            weight: formData.weight,
            height: formData.height,
            age: formData.age,
            gender: formData.gender,
            activityLevel: formData.activity,
            goal: formData.goal,
            dailyCalorieTarget: results.targetCalories,
            proteinTarget: results.protein,
            carbsTarget: results.carbs,
            fatTarget: results.fat,
        });

        setSaved(true);
    };

    if (!user) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="animate-fade-in">
            <div className="mb-8">
                <h1 className="page-title flex items-center gap-3"><Calculator className="w-8 h-8 text-[var(--accent-primary)]" /> Calorie Calculator</h1>
                <p className="page-subtitle">Calculate your daily calorie needs and save to your profile.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Calculator Form */}
                <div className="card">
                    <h3 className="font-semibold mb-4">Settings for {user.fullName}</h3>

                    <div className="space-y-4">
                        {/* Gender Selection */}
                        <div>
                            <label className="form-label">Gender</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="gender"
                                        checked={formData.gender === 'male'}
                                        onChange={() => setFormData({ ...formData, gender: 'male' })}
                                    />
                                    Male
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="gender"
                                        checked={formData.gender === 'female'}
                                        onChange={() => setFormData({ ...formData, gender: 'female' })}
                                    />
                                    Female
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Weight (kg)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.weight || ''}
                                    onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div>
                                <label className="form-label">Height (cm)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.height || ''}
                                    onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="form-label">Age</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.age || ''}
                                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                            />
                        </div>

                        <div>
                            <label className="form-label">Activity Level</label>
                            <select
                                className="form-input"
                                value={formData.activity}
                                onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                            >
                                <option value="sedentary">Sedentary (desk job, little exercise)</option>
                                <option value="light">Light (light exercise 1-3x/week)</option>
                                <option value="moderate">Moderate (moderate exercise 3-5x/week)</option>
                                <option value="active">Active (hard exercise 6-7x/week)</option>
                                <option value="very_active">Very Active (athlete, physical job)</option>
                            </select>
                        </div>

                        <div>
                            <label className="form-label">Goal</label>
                            <select
                                className="form-input"
                                value={formData.goal}
                                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                            >
                                <option value="aggressive_loss">Aggressive Fat Loss (-1.0kg/week)</option>
                                <option value="fat_loss">Moderate Fat Loss (-0.5kg/week)</option>
                                <option value="slow_loss">Slow Fat Loss (-0.25kg/week)</option>
                                <option value="maintain">Maintain Weight</option>
                                <option value="lean_gain">Lean Muscle Gain (+0.3kg/week)</option>
                                <option value="muscle_gain">Maximum Muscle Building (+0.5kg/week)</option>
                            </select>
                        </div>

                        <button onClick={calculateTDEE} className="btn-primary w-full">
                            Calculate My Needs
                        </button>
                    </div>
                </div>

                {/* Study Citation */}
                <div className="text-center text-xs text-gray-500 mb-8 max-w-2xl mx-auto">
                    Based on verified scientific formulas (Mifflin–St Jeor).<br />
                    Reference: <a href="https://www.mdpi.com/2072-6643/17/3/482?utm_source=chatgpt.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                        MDPI Nutrients Study 2025
                    </a>
                </div>

                {/* Results */}
                {results && (
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Your Results</h3>
                            {saved && (
                                <span className="badge badge-success flex items-center gap-1"><Check className="w-3 h-3" /> Saved!</span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="stat-card">
                                <div className="stat-label">Maintenance (TDEE)</div>
                                <div className="text-3xl font-bold">{results.tdee.toLocaleString()}</div>
                                <div className="stat-label">kcal/day</div>
                            </div>
                            <div className="stat-card" style={{ borderColor: theme.primary, borderWidth: 2 }}>
                                <div className="stat-label">Target Calories</div>
                                <div className="text-3xl font-bold" style={{ color: theme.primary }}>
                                    {results.targetCalories.toLocaleString()}
                                </div>
                                <div className="stat-label">
                                    {formData.goal.includes('loss') ? 'kcal/day for fat loss' :
                                        formData.goal.includes('gain') ? 'kcal/day for muscle gain' :
                                            'kcal/day'}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="stat-card">
                                <div className="text-4xl mb-2 flex justify-center"><Dumbbell className="w-8 h-8 text-[var(--protein)]" /></div>
                                <div className="text-2xl font-bold" style={{ color: 'var(--protein)' }}>{results.protein}g</div>
                                <div className="stat-label">Protein</div>
                            </div>
                            <div className="stat-card">
                                <div className="text-4xl mb-2 flex justify-center"><Wheat className="w-8 h-8 text-[var(--carbs)]" /></div>
                                <div className="text-2xl font-bold" style={{ color: 'var(--carbs)' }}>{results.carbs}g</div>
                                <div className="stat-label">Carbs</div>
                            </div>
                            <div className="stat-card">
                                <div className="text-4xl mb-2 flex justify-center"><Droplet className="w-8 h-8 text-[var(--fat)]" /></div>
                                <div className="text-2xl font-bold" style={{ color: 'var(--fat)' }}>{results.fat}g</div>
                                <div className="stat-label">Fat</div>
                            </div>
                        </div>

                        <button
                            onClick={saveToProfile}
                            disabled={saved}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {saved ? <><Check className="w-4 h-4" /> Saved to Profile</> : <><Save className="w-4 h-4" /> Save as My Targets</>}
                        </button>

                        {saved && (
                            <p className="text-sm text-center mt-3" style={{ color: 'var(--success)' }}>
                                Your targets have been updated across the app!
                            </p>
                        )}

                        <div className="p-4 rounded-lg mt-4" style={{ background: 'var(--bg-secondary)' }}>
                            <h4 className="font-medium mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-yellow-400" /> Tips for Success</h4>
                            <ul className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                                <li>• Prioritize protein at every meal to preserve muscle</li>
                                <li>• Train 30-60 min before breaking your fast</li>
                                <li>• Drink 2.5-3L of water daily</li>
                                <li>• Get 7+ hours of sleep for recovery</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* Current Settings */}
            <div className="card mt-6">
                <h3 className="font-semibold mb-4">Current Saved Targets</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                        <div className="text-2xl font-bold" style={{ color: theme.primary }}>{settings.dailyCalorieTarget}</div>
                        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Daily Calories</div>
                    </div>
                    <div className="text-center p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                        <div className="text-2xl font-bold" style={{ color: 'var(--protein)' }}>{settings.proteinTarget}g</div>
                        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Protein</div>
                    </div>
                    <div className="text-center p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                        <div className="text-2xl font-bold" style={{ color: 'var(--carbs)' }}>{settings.carbsTarget}g</div>
                        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Carbs</div>
                    </div>
                    <div className="text-center p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                        <div className="text-2xl font-bold" style={{ color: 'var(--fat)' }}>{settings.fatTarget}g</div>
                        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Fat</div>
                    </div>
                </div>
                <p className="text-sm text-center mt-4" style={{ color: 'var(--text-muted)' }}>
                    These targets are used in Dashboard, Macro Tracker, and Statistics.
                    {isSaving && <span className="ml-2 text-blue-400">Saving to database...</span>}
                </p>
            </div>

            {/* Weekly Weight Tracking */}
            <div className="card mt-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Weekly Weight Progress</h3>

                {/* Add Weight Form */}
                <div className="p-4 rounded-lg mb-4" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="form-label">This Week&apos;s Weight (kg)</label>
                            <input
                                type="number"
                                step="0.1"
                                className="form-input"
                                placeholder="e.g., 114.5"
                                value={newWeight}
                                onChange={(e) => setNewWeight(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="form-label">Notes (optional)</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g., Felt good this week, exercised 4x"
                                value={newWeightNotes}
                                onChange={(e) => setNewWeightNotes(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={addWeightLog}
                            className="btn-primary flex items-center gap-2"
                            disabled={!newWeight || isSavingWeight}
                        >
                            {isSavingWeight ? 'Saving...' : <><Plus className="w-4 h-4" /> Log Weight</>}
                        </button>
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                        Week of: {getCurrentWeekDate()}
                    </p>
                </div>

                {/* Weight History */}
                {isLoadingWeights ? (
                    <p className="text-center py-4" style={{ color: 'var(--text-muted)' }}>Loading weight history...</p>
                ) : weightLogs.length === 0 ? (
                    <p className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
                        No weight entries yet. Start tracking your progress above!
                    </p>
                ) : (
                    <>
                        {/* Progress Summary */}
                        {weightLogs.length >= 2 && (
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="stat-card">
                                    <div className="stat-label">Starting</div>
                                    <div className="text-xl font-bold">
                                        {weightLogs[weightLogs.length - 1].weight} kg
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Current</div>
                                    <div className="text-xl font-bold" style={{ color: theme.primary }}>
                                        {weightLogs[0].weight} kg
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Change</div>
                                    <div className="text-xl font-bold" style={{
                                        color: weightLogs[0].weight < weightLogs[weightLogs.length - 1].weight
                                            ? 'var(--success)'
                                            : 'var(--error)'
                                    }}>
                                        {(weightLogs[0].weight - weightLogs[weightLogs.length - 1].weight).toFixed(1)} kg
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Weight Log List */}
                        <div className="space-y-2">
                            {weightLogs.slice(0, 8).map((log) => (
                                <div
                                    key={log.id}
                                    className="flex items-center justify-between p-3 rounded-lg"
                                    style={{ background: 'var(--bg-secondary)' }}
                                >
                                    <div>
                                        <span className="font-medium">
                                            {new Date(log.weekDate).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </span>
                                        {log.notes && (
                                            <span className="text-sm ml-2" style={{ color: 'var(--text-muted)' }}>
                                                — {log.notes}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-lg font-bold" style={{ color: theme.primary }}>
                                        {log.weight} kg
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
