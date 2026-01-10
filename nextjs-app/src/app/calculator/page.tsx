'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';
import {
    Calculator, Check, Save, Lightbulb, TrendingUp,
    Dumbbell, Wheat, Droplet, Plus, Info, Activity, Target
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
        neck: 0,
        waist: 0,
        hip: 0,
    });

    const [activeTab, setActiveTab] = useState<'calories' | 'bodyfat' | 'ideal'>('calories');

    const [bfResults, setBfResults] = useState<{
        bodyFatPercent: number;
        fatMass: number;
        leanMass: number;
        category: string;
    } | null>(null);

    const [idealResults, setIdealResults] = useState<{
        robinson: number;
        miller: number;
        devine: number;
        hamwi: number;
        bmiRange: [number, number];
    } | null>(null);

    const [results, setResults] = useState<{
        tdee: number;
        targetCalories: number;
        protein: number;
        carbs: number;
        fat: number;
        weeklyChange: number;
        zigzag?: {
            highDays: number;
            lowDays: number;
            highCalories: number;
            lowCalories: number;
        };
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
            neck: prev.neck,
            waist: prev.waist,
            hip: prev.hip,
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

        // Algorithm:
        // Loss: Protein 1.8g/kg (High but balanced), Fat 0.8g/kg
        // Aggressive Loss: Protein 2.0g/kg, Fat 0.7g/kg
        // Gain: Protein 2.0g/kg, Fat 0.9g/kg
        // Maintenance: Protein 1.6g/kg, Fat 1.0g/kg

        let pBase = 1.8;
        let fBase = 0.8;

        if (goal === 'aggressive_loss') {
            pBase = 2.0; fBase = 0.7;
        } else if (goal.includes('gain')) {
            pBase = 2.0; fBase = 0.9;
        } else if (goal === 'maintain') {
            pBase = 1.6; fBase = 1.0;
        }

        const minCarbsGrams = 30; // Safety floor

        // Strategies: Optimal -> Reduced Fat -> Reduced Protein -> Min Both
        const strategies = [
            { p: pBase, f: fBase },
            { p: pBase, f: Math.max(0.6, fBase - 0.1) },
            { p: Math.max(1.6, pBase - 0.2), f: fBase },
            { p: Math.max(1.6, pBase - 0.2), f: Math.max(0.6, fBase - 0.1) },
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

        // Zigzag Calculation (5 Low, 2 High)
        // High Day = Maintenance (or Target + 300 if gaining)
        let highCal = tdee;
        if (goal.includes('gain')) highCal = targetCalories + 300;
        else if (goal === 'maintain') highCal = targetCalories + 200;

        const weeklyTotal = targetCalories * 7;
        const highTotal = highCal * 2;
        const lowTotal = weeklyTotal - highTotal;
        const lowCal = Math.round(lowTotal / 5);

        setResults({
            tdee,
            targetCalories,
            protein,
            carbs,
            fat,
            weeklyChange,
            zigzag: {
                highDays: 2,
                lowDays: 5,
                highCalories: highCal,
                lowCalories: lowCal
            }
        });
        setSaved(false);
    };

    const calculateBodyFat = () => {
        const { height, waist, neck, hip, gender, weight } = formData;
        if (!waist || !neck || !height) return;

        let bodyFat = 0;
        // U.S. Navy Method
        if (gender === 'male') {
            // 495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)) - 450
            bodyFat = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
        } else {
            // 495 / (1.29579 - 0.35004 * log10(waist + hip - neck) + 0.22100 * log10(height)) - 450
            bodyFat = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(height)) - 450;
        }

        bodyFat = Math.round(bodyFat * 10) / 10;
        const fatMass = Math.round((bodyFat / 100) * weight * 10) / 10;
        const leanMass = Math.round((weight - fatMass) * 10) / 10;

        let category = '';
        if (gender === 'male') {
            if (bodyFat < 6) category = 'Essential Fat';
            else if (bodyFat < 14) category = 'Athletes';
            else if (bodyFat < 18) category = 'Fitness';
            else if (bodyFat < 25) category = 'Average';
            else category = 'Obese';
        } else {
            if (bodyFat < 14) category = 'Essential Fat';
            else if (bodyFat < 21) category = 'Athletes';
            else if (bodyFat < 25) category = 'Fitness';
            else if (bodyFat < 32) category = 'Average';
            else category = 'Obese';
        }

        setBfResults({ bodyFatPercent: bodyFat, fatMass, leanMass, category });
    };

    const calculateIdealWeight = () => {
        const { height, gender } = formData; // height in cm
        if (!height) return;

        const heightInInches = height / 2.54;
        const over60Inches = Math.max(0, heightInInches - 60);

        let robinson = 0, miller = 0, devine = 0, hamwi = 0;

        if (gender === 'male') {
            robinson = 52 + 1.9 * over60Inches;
            miller = 56.2 + 1.41 * over60Inches;
            devine = 50 + 2.3 * over60Inches;
            hamwi = 48 + 2.7 * over60Inches;
        } else {
            robinson = 49 + 1.7 * over60Inches;
            miller = 53.1 + 1.36 * over60Inches;
            devine = 45.5 + 2.3 * over60Inches;
            hamwi = 45.5 + 2.2 * over60Inches;
        }

        // BMI Range (18.5 - 25)
        // BMI = weight(kg) / height(m)^2
        // Weight = BMI * height(m)^2
        const hM = height / 100;
        const minWeight = 18.5 * hM * hM;
        const maxWeight = 25 * hM * hM;

        setIdealResults({
            robinson: Math.round(robinson * 10) / 10,
            miller: Math.round(miller * 10) / 10,
            devine: Math.round(devine * 10) / 10,
            hamwi: Math.round(hamwi * 10) / 10,
            bmiRange: [Math.round(minWeight * 10) / 10, Math.round(maxWeight * 10) / 10]
        });
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
                <p className="page-subtitle">Calculate your daily needs, body fat, and ideal weight.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button
                    onClick={() => setActiveTab('calories')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'calories'
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-gray-700'
                        }`}
                >
                    <Calculator className="w-4 h-4" /> Calorie Calculator
                </button>
                <button
                    onClick={() => setActiveTab('bodyfat')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'bodyfat'
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-gray-700'
                        }`}
                >
                    <Activity className="w-4 h-4" /> Body Fat
                </button>
                <button
                    onClick={() => setActiveTab('ideal')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'ideal'
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-gray-700'
                        }`}
                >
                    <Target className="w-4 h-4" /> Ideal Weight
                </button>
            </div>

            {activeTab === 'calories' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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


                                {/* Zigzag Schedule */}
                                {results.zigzag && (
                                    <div className="mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-emerald-400" /> Zigzag Calorie Cycling (Recommended)
                                        </h4>
                                        <p className="text-xs text-gray-400 mb-4">
                                            Prevent metabolic adaptation by cycling your calories. Eat more on weekends (High Days) and less during the week (Low Days) to average your target.
                                        </p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="text-center p-3 bg-gray-900 rounded-lg border border-gray-800">
                                                <div className="text-xl font-bold text-emerald-400">{results.zigzag.lowCalories}</div>
                                                <div className="text-xs text-gray-500">Low Days (5 days/wk)</div>
                                            </div>
                                            <div className="text-center p-3 bg-gray-900 rounded-lg border border-gray-800">
                                                <div className="text-xl font-bold text-amber-400">{results.zigzag.highCalories}</div>
                                                <div className="text-xs text-gray-500">High Days (2 days/wk)</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

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

                                {/* Scientific Reference Section */}
                                <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
                                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-gray-300">
                                        <Info className="w-4 h-4 text-blue-400" /> Scientific Methodology
                                    </h3>
                                    <div className="text-xs text-gray-400 space-y-2">
                                        <p>
                                            This calculator uses the <strong>Mifflin-St Jeor Equation</strong>, the industry standard for BMR accuracy.
                                        </p>
                                        <div>
                                            <strong className="text-gray-300">Macronutrient Distribution Sources:</strong>
                                            <ul className="list-disc pl-4 mt-1 space-y-1">
                                                <li><strong>Protein:</strong> 1.6 - 2.2g/kg (ISSN/ACSM for muscle preservation & growth).</li>
                                                <li><strong>Fats:</strong> 0.6 - 1.0g/kg (Minimum for hormonal health).</li>
                                                <li><strong>Carbohydrates:</strong> Remainder for energy and glycogen.</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <strong className="text-gray-300">Why Zigzag?</strong>
                                            <p>Alternating calorie intake helps prevent metabolic adaptation (slowing down BMR) during prolonged dieting.</p>
                                        </div>
                                    </div>
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
                </div>
            )}

            {/* Body Fat Calculator Content */}
            {activeTab === 'bodyfat' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
                    <div className="card">
                        <h3 className="font-semibold mb-4">Body Fat Calculator (U.S. Navy Method)</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Gender</label>
                                    <select
                                        className="form-input"
                                        value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })}
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Height (cm)</label>
                                    <input type="number" className="form-input" value={formData.height || ''} onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="form-label">Weight (kg)</label>
                                    <input type="number" className="form-input" value={formData.weight || ''} onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="form-label">Neck (cm)</label>
                                    <input type="number" className="form-input" value={formData.neck || ''} onChange={(e) => setFormData({ ...formData, neck: parseInt(e.target.value) || 0 })} placeholder="Neck circumference" />
                                </div>
                                <div>
                                    <label className="form-label">Waist (cm)</label>
                                    <input type="number" className="form-input" value={formData.waist || ''} onChange={(e) => setFormData({ ...formData, waist: parseInt(e.target.value) || 0 })} placeholder="Waist circumference" />
                                </div>
                                {formData.gender === 'female' && (
                                    <div>
                                        <label className="form-label">Hip (cm)</label>
                                        <input type="number" className="form-input" value={formData.hip || ''} onChange={(e) => setFormData({ ...formData, hip: parseInt(e.target.value) || 0 })} placeholder="Hip circumference" />
                                    </div>
                                )}
                            </div>

                            <button onClick={calculateBodyFat} className="btn-primary w-full">Calculate Body Fat</button>

                            {bfResults && (
                                <div className="mt-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                                    <div className="text-center mb-4">
                                        <div className="text-sm text-gray-400">Body Fat Percentage</div>
                                        <div className="text-4xl font-bold text-emerald-400">{bfResults.bodyFatPercent}%</div>
                                        <div className="text-sm text-emerald-300 font-medium">{bfResults.category}</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div className="p-3 bg-gray-900 rounded-lg">
                                            <div className="text-xl font-bold">{bfResults.fatMass} kg</div>
                                            <div className="text-xs text-gray-500">Fat Mass</div>
                                        </div>
                                        <div className="p-3 bg-gray-900 rounded-lg">
                                            <div className="text-xl font-bold">{bfResults.leanMass} kg</div>
                                            <div className="text-xs text-gray-500">Lean Mass</div>
                                        </div>
                                    </div>
                                    <div className="mt-4 text-xs text-center text-gray-500">
                                        Based on U.S. Navy Method suitable for most people.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Ideal Weight Calculator Content */}
            {activeTab === 'ideal' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
                    <div className="card">
                        <h3 className="font-semibold mb-4">Ideal Weight Calculator</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Gender</label>
                                    <select
                                        className="form-input"
                                        value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })}
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Height (cm)</label>
                                    <input type="number" className="form-input" value={formData.height || ''} onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) || 0 })} />
                                </div>
                            </div>

                            <button onClick={calculateIdealWeight} className="btn-primary w-full">Calculate Ideal Weight</button>

                            {idealResults && (
                                <div className="mt-6 space-y-4">
                                    <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl text-center">
                                        <div className="text-sm text-gray-400">Healthy BMI Range (18.5 - 25)</div>
                                        <div className="text-2xl font-bold text-emerald-400">
                                            {idealResults.bmiRange[0]} - {idealResults.bmiRange[1]} kg
                                        </div>
                                    </div>

                                    <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-900 text-gray-400">
                                                <tr>
                                                    <th className="p-3">Formula</th>
                                                    <th className="p-3 text-right">Ideal Weight</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-700">
                                                <tr>
                                                    <td className="p-3">Robinson (1983)</td>
                                                    <td className="p-3 text-right font-medium">{idealResults.robinson} kg</td>
                                                </tr>
                                                <tr>
                                                    <td className="p-3">Miller (1983)</td>
                                                    <td className="p-3 text-right font-medium">{idealResults.miller} kg</td>
                                                </tr>
                                                <tr>
                                                    <td className="p-3">Devine (1974)</td>
                                                    <td className="p-3 text-right font-medium">{idealResults.devine} kg</td>
                                                </tr>
                                                <tr>
                                                    <td className="p-3">Hamwi (1964)</td>
                                                    <td className="p-3 text-right font-medium">{idealResults.hamwi} kg</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className="text-xs text-center text-gray-500">
                                        Different formulas may yield different results. The BMI range is generally the most medically accepted standard.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
        </div >
    );
}
