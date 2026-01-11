'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
    Heart, Zap, Sun, Moon, Sparkles, ChevronRight,
    Dumbbell, PersonStanding, Waves, Bike,
    Target, Swords, Footprints, Flame, StretchHorizontal, Mountain,
    Home, TreePine, Building2, Check, Brain
} from 'lucide-react';

// Sport types with Lucide icons and valid locations
const SPORTS = [
    { id: 'gym', Icon: Dumbbell, locations: ['gym'] },
    { id: 'running', Icon: PersonStanding, locations: ['outdoor', 'gym'] },
    { id: 'swimming', Icon: Waves, locations: ['gym', 'outdoor'] },
    { id: 'cycling', Icon: Bike, locations: ['outdoor', 'gym', 'home'] },
    { id: 'yoga', Icon: StretchHorizontal, locations: ['home', 'gym', 'outdoor'] },
    { id: 'hiit', Icon: Zap, locations: ['home', 'gym', 'outdoor'] },
    { id: 'boxing', Icon: Swords, locations: ['gym'] },
    { id: 'football', Icon: Footprints, locations: ['outdoor'] },
    { id: 'basketball', Icon: Target, locations: ['outdoor', 'gym'] },
    { id: 'crossfit', Icon: Flame, locations: ['gym'] },
    { id: 'hiking', Icon: Mountain, locations: ['outdoor'] },
    { id: 'stretching', Icon: StretchHorizontal, locations: ['home', 'gym'] },
];

// Training locations
const LOCATIONS = [
    { id: 'home', Icon: Home },
    { id: 'gym', Icon: Building2 },
    { id: 'outdoor', Icon: TreePine },
];

// Home equipment options
const EQUIPMENT = [
    'dumbbells',
    'resistance_bands',
    'pull_up_bar',
    'yoga_mat',
    'kettlebell',
    'jump_rope',
    'foam_roller',
    'bench',
    'barbell',
    'treadmill',
    'stationary_bike',
    'none',
];

interface Exercise {
    name: string;
    sets: string;
    reps: string;
    rest: string;
}

interface Workout {
    title: string;
    duration: string;
    difficulty: string;
    exercises: Exercise[];
}

interface CoachPlan {
    motivation: string;
    workout: Workout;
    recommendation: string;
}

export default function CoachPage() {
    const t = useTranslations('coach');
    const locale = useLocale();
    const [step, setStep] = useState<'loading' | 'checkin' | 'generating' | 'result'>('loading');

    // Check-in State
    const [sleep, setSleep] = useState(7);
    const [mood, setMood] = useState(7);
    const [energy, setEnergy] = useState(7);
    const [sportType, setSportType] = useState('hiit');
    const [location, setLocation] = useState('gym');
    const [equipment, setEquipment] = useState<string[]>([]);
    const [notes, setNotes] = useState('');

    // Result State
    const [plan, setPlan] = useState<CoachPlan | null>(null);

    // Get sports available for current location
    const availableSports = SPORTS.filter(s => s.locations.includes(location));

    // Handle location change - reset sport if not available
    const handleLocationChange = (newLocation: string) => {
        setLocation(newLocation);
        const currentSportValid = SPORTS.find(s => s.id === sportType)?.locations.includes(newLocation);
        if (!currentSportValid) {
            const firstAvailable = SPORTS.find(s => s.locations.includes(newLocation));
            if (firstAvailable) setSportType(firstAvailable.id);
        }
    };

    useEffect(() => {
        fetch('/api/v2/checkin')
            .then(res => res.json())
            .then(data => {
                if (data.sleep_hours) {
                    setSleep(data.sleep_hours);
                    setMood(data.mood_score || 7);
                    setEnergy(data.energy_level || 7);
                }
                setStep('checkin');
            })
            .catch(() => setStep('checkin'));
    }, []);

    const toggleEquipment = (item: string) => {
        if (item === 'none') {
            setEquipment(['none']);
        } else {
            setEquipment(prev => {
                const filtered = prev.filter(e => e !== 'none');
                return filtered.includes(item)
                    ? filtered.filter(e => e !== item)
                    : [...filtered, item];
            });
        }
    };

    const handleGenerate = async () => {
        setStep('generating');

        await fetch('/api/v2/checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sleep_hours: sleep,
                mood_score: mood,
                energy_level: energy,
                sport_type: sportType,
                training_location: location,
                equipment: location === 'home' ? equipment : [],
                notes
            })
        });

        try {
            const res = await fetch('/api/v2/ai/coach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locale: locale || 'en' })
            });

            if (!res.ok) throw new Error('AI Error');
            const data = await res.json();

            // Validation Check
            if (!data || !data.workout) {
                throw new Error('Invalid Data');
            }

            setPlan(data);
            setStep('result');
        } catch (error) {
            console.error(error);
            setStep('checkin'); // Or show error toast
        }
    };

    if (step === 'loading') {
        return (
            <div className="animate-fade-in flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Heart className="w-12 h-12 text-emerald-400 animate-pulse mx-auto mb-4" />
                    <p className="text-gray-400">{t('analyzing')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            {/* Hero Header */}
            <div className="relative mb-8 py-8 px-6 rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-900/40 to-teal-900/60 border border-emerald-500/20">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-600/20 via-transparent to-transparent"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
                        <Heart className="w-8 h-8 text-emerald-400" /> {t('title')}
                    </h1>
                    <p className="text-emerald-200/80">{t('subtitle')}</p>
                </div>
            </div>

            {step === 'checkin' && (
                <div className="card bg-gradient-to-br from-slate-900/80 to-slate-800/50 border border-white/5">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-emerald-400" /> {t('howAreYouFeeling')}
                    </h2>

                    <div className="space-y-6">
                        {/* Sleep */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
                                <Moon className="w-4 h-4 text-indigo-400" /> {t('sleep')} ({sleep}h)
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="12"
                                step="0.5"
                                value={sleep}
                                onChange={(e) => setSleep(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>0h</span>
                                <span>12h</span>
                            </div>
                        </div>

                        {/* Mood & Energy Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Mood */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
                                    <Sun className="w-4 h-4 text-yellow-400" /> {t('mood')} ({mood}/10)
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={mood}
                                    onChange={(e) => setMood(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                />
                            </div>

                            {/* Energy */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
                                    <Zap className="w-4 h-4 text-orange-400" /> {t('energy')} ({energy}/10)
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={energy}
                                    onChange={(e) => setEnergy(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                />
                            </div>
                        </div>

                        {/* Training Location */}
                        <div>
                            <label className="text-sm font-medium text-gray-300 mb-3 block">{t('trainingLocation')}</label>
                            <div className="grid grid-cols-3 gap-3">
                                {LOCATIONS.map(loc => (
                                    <button
                                        key={loc.id}
                                        onClick={() => handleLocationChange(loc.id)}
                                        className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${location === loc.id
                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                                            : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 border border-white/5'
                                            }`}
                                    >
                                        <loc.Icon size={24} />
                                        <span className="text-sm font-medium">{t(`locations.${loc.id}`)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Equipment - Only show if location is home */}
                        {location === 'home' && (
                            <div>
                                <label className="text-sm font-medium text-gray-300 mb-3 block">{t('availableEquipment')}</label>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {EQUIPMENT.map(item => (
                                        <button
                                            key={item}
                                            onClick={() => toggleEquipment(item)}
                                            className={`p-3 rounded-lg text-sm flex items-center gap-2 transition-all ${equipment.includes(item)
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 border border-white/5'
                                                }`}
                                        >
                                            {equipment.includes(item) && <Check size={14} />}
                                            <span className="truncate">{t(`equipment.${item}`)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sport Type Selector */}
                        <div>
                            <label className="text-sm font-medium text-gray-300 mb-3 block">{t('sportType')}</label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                {availableSports.map(sport => (
                                    <button
                                        key={sport.id}
                                        onClick={() => setSportType(sport.id)}
                                        className={`p-3 rounded-xl flex flex-col items-center gap-2 transition-all ${sportType === sport.id
                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                                            : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 border border-white/5'
                                            }`}
                                    >
                                        <sport.Icon size={20} />
                                        <span className="text-xs truncate w-full text-center">{t(`sports.${sport.id}`)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="text-sm font-medium text-gray-300 mb-2 block">{t('notes')}</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="e.g., Feeling sore from yesterday, had a stressful day..."
                                className="w-full bg-gray-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all resize-none"
                                rows={3}
                            />
                        </div>

                        <button
                            onClick={handleGenerate}
                            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
                        >
                            <Sparkles className="w-5 h-5" /> {t('generatePlan')}
                        </button>
                    </div>
                </div>
            )}

            {step === 'generating' && (
                <div className="card bg-gradient-to-br from-slate-900/80 to-slate-800/50 border border-white/5 text-center py-16">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-emerald-500/30 animate-ping"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 animate-spin"></div>
                        <Heart className="absolute inset-0 m-auto w-10 h-10 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{t('analyzing')}</h3>
                    <p className="text-gray-400">{t('preparingPlan')}</p>
                </div>
            )}

            {step === 'result' && plan && (
                <div className="space-y-6 animate-fade-in">
                    {/* Motivation Card */}
                    <div className="card bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-500/20">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                <Brain className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-emerald-300 mb-2">{t('todaysMotivation')}</h3>
                                <p className="text-lg text-white italic">"{plan.motivation}"</p>
                            </div>
                        </div>
                    </div>

                    {/* Single Workout Plan */}
                    <div className="card bg-gradient-to-br from-slate-900/80 to-slate-800/50 border border-white/5">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Dumbbell className="w-5 h-5 text-emerald-400" /> {plan.workout.title}
                            </h3>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-sm font-medium border border-emerald-500/20">
                                    {plan.workout.duration}
                                </span>
                                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-sm font-medium border border-blue-500/20">
                                    {plan.workout.difficulty}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {(plan.workout?.exercises && Array.isArray(plan.workout.exercises)) ? (
                                plan.workout.exercises.map((ex, i) => (
                                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 hover:border-emerald-500/30 transition-colors">
                                        <div className="mb-2 sm:mb-0">
                                            <p className="font-bold text-white text-lg">{ex.name || 'Exercise'}</p>
                                            <p className="text-gray-400 text-sm">{(ex.sets || '3') + ' sets'} × {(ex.reps || '10') + ' reps'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Rest</span>
                                            <span className="px-2 py-1 bg-emerald-900/40 text-emerald-400 rounded font-mono text-sm border border-emerald-500/20">
                                                {ex.rest || '60s'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center text-gray-400">
                                    {plan.workout?.title ? 'Detailed exercises not available' : 'Loading workout data...'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recommendation */}
                    {plan.recommendation && (
                        <div className="card bg-gradient-to-br from-orange-900/20 to-amber-900/20 border border-orange-500/20">
                            <h3 className="font-bold text-orange-300 mb-2 flex items-center gap-2">
                                <Sparkles className="w-5 h-5" /> {t('todaysRecommendation')}
                            </h3>
                            <p className="text-gray-300">{plan.recommendation}</p>
                        </div>
                    )}

                    {/* Regenerate Button */}
                    <button
                        onClick={() => setStep('checkin')}
                        className="w-full py-4 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 rounded-xl font-medium transition-all border border-white/5 hover:text-white"
                    >
                        {t('updateCheckin')}
                    </button>
                </div>
            )}
        </div>
    );
}
