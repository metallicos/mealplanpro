'use client';

import { useState, useEffect } from 'react';
import {
    Heart, Brain, Zap, Dumbbell, PersonStanding, Waves, Bike,
    Target, Swords, Footprints, Flame, StretchHorizontal, Mountain,
    Home, TreePine, Building2, Check
} from 'lucide-react';
import { useTranslations } from 'next-intl';

// Sport types with Lucide icons
const SPORTS = [
    { id: 'gym', Icon: Dumbbell },
    { id: 'running', Icon: PersonStanding },
    { id: 'swimming', Icon: Waves },
    { id: 'cycling', Icon: Bike },
    { id: 'yoga', Icon: StretchHorizontal },
    { id: 'hiit', Icon: Zap },
    { id: 'boxing', Icon: Swords },
    { id: 'football', Icon: Footprints },
    { id: 'basketball', Icon: Target },
    { id: 'crossfit', Icon: Flame },
    { id: 'hiking', Icon: Mountain },
    { id: 'home_workout', Icon: Home },
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

interface Workout {
    type: string;
    duration: string;
    exercises: string[];
}

interface AiResponse {
    motivation: string;
    workouts: Workout[];
    recommendation: string;
}

export default function AiCoachWidget() {
    const t = useTranslations('coach');
    const [step, setStep] = useState<'loading' | 'checkin' | 'generating' | 'result'>('loading');

    // Check-in State
    const [sleep, setSleep] = useState(7);
    const [mood, setMood] = useState(5);
    const [energy, setEnergy] = useState(5);
    const [sportType, setSportType] = useState('gym');
    const [location, setLocation] = useState('gym');
    const [equipment, setEquipment] = useState<string[]>([]);
    const [notes, setNotes] = useState('');

    // Result State
    const [plan, setPlan] = useState<AiResponse | null>(null);

    useEffect(() => {
        checkTodayStatus();
    }, []);

    const checkTodayStatus = async () => {
        try {
            const res = await fetch('/api/v2/checkin');
            const data = await res.json();

            if (data && data.sleep_hours) {
                setSleep(data.sleep_hours);
                setMood(data.mood_score);
                setEnergy(data.energy_level);
                setStep('checkin');
            } else {
                setStep('checkin');
            }
        } catch (error) {
            setStep('checkin');
        }
    };

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

        // Save Check-in with all preferences
        await fetch('/api/v2/checkin', {
            method: 'POST',
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

        // Call AI
        try {
            const res = await fetch('/api/v2/ai/coach', { method: 'POST' });
            if (!res.ok) throw new Error('AI Error');
            const data = await res.json();
            setPlan(data);
            setStep('result');
        } catch (error) {
            setStep('checkin');
        }
    };

    if (step === 'loading') return <div className="card h-64 animate-pulse bg-gray-800"></div>;

    return (
        <div className="card border-none bg-gradient-to-br from-emerald-900/50 to-teal-900/50 text-white relative overflow-hidden">
            <div className="relative z-10">
                <h3 className="text-lg sm:text-xl font-bold mb-1 flex items-center gap-2">
                    <Heart className="text-emerald-300 flex-shrink-0" /> <span className="truncate">{t('title')}</span>
                </h3>
                <p className="text-sm text-emerald-200 mb-4 line-clamp-2">{t('subtitle')}</p>

                {step === 'checkin' && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Sleep Slider */}
                        <div>
                            <label className="text-xs uppercase tracking-wider text-emerald-300">{t('sleep')} ({sleep}h)</label>
                            <input
                                type="range" min="0" max="12" step="0.5"
                                value={sleep} onChange={e => setSleep(parseFloat(e.target.value))}
                                className="w-full accent-emerald-400"
                            />
                        </div>

                        {/* Mood & Energy */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs uppercase tracking-wider text-emerald-300">{t('mood')} ({mood}/10)</label>
                                <input
                                    type="range" min="1" max="10"
                                    value={mood} onChange={e => setMood(parseInt(e.target.value))}
                                    className="w-full accent-emerald-400"
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-wider text-emerald-300">{t('energy')} ({energy}/10)</label>
                                <input
                                    type="range" min="1" max="10"
                                    value={energy} onChange={e => setEnergy(parseInt(e.target.value))}
                                    className="w-full accent-emerald-400"
                                />
                            </div>
                        </div>

                        {/* Training Location */}
                        <div>
                            <label className="text-xs uppercase tracking-wider text-emerald-300 block mb-2">{t('trainingLocation')}</label>
                            <div className="grid grid-cols-3 gap-2">
                                {LOCATIONS.map(loc => (
                                    <button
                                        key={loc.id}
                                        onClick={() => setLocation(loc.id)}
                                        className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-all ${location === loc.id
                                                ? 'bg-emerald-500 text-white shadow-lg'
                                                : 'bg-black/20 hover:bg-black/40 text-gray-300'
                                            }`}
                                    >
                                        <loc.Icon size={20} />
                                        <span className="text-xs">{t(`locations.${loc.id}`)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Equipment - Only show if location is home */}
                        {location === 'home' && (
                            <div>
                                <label className="text-xs uppercase tracking-wider text-emerald-300 block mb-2">{t('availableEquipment')}</label>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                                    {EQUIPMENT.map(item => (
                                        <button
                                            key={item}
                                            onClick={() => toggleEquipment(item)}
                                            className={`p-2 rounded-lg text-xs flex items-center gap-1 transition-all ${equipment.includes(item)
                                                    ? 'bg-emerald-500 text-white'
                                                    : 'bg-black/20 hover:bg-black/40 text-gray-300'
                                                }`}
                                        >
                                            {equipment.includes(item) && <Check size={12} />}
                                            <span className="truncate">{t(`equipment.${item}`)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sport Type Selector */}
                        <div>
                            <label className="text-xs uppercase tracking-wider text-emerald-300 block mb-2">{t('sportType')}</label>
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                {SPORTS.map(sport => (
                                    <button
                                        key={sport.id}
                                        onClick={() => setSportType(sport.id)}
                                        className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-all ${sportType === sport.id
                                                ? 'bg-emerald-500 text-white scale-105 shadow-lg'
                                                : 'bg-black/20 hover:bg-black/40 text-gray-300'
                                            }`}
                                        title={t(`sports.${sport.id}`)}
                                    >
                                        <sport.Icon size={18} />
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-emerald-400 mt-1 text-center">{t(`sports.${sportType}`)}</p>
                        </div>

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            className="w-full py-3 bg-white text-emerald-900 font-bold rounded-lg hover:bg-emerald-50 transition-colors shadow-lg shadow-white/10 flex items-center justify-center gap-2"
                        >
                            {t('generatePlan')} <Zap size={16} />
                        </button>
                    </div>
                )}

                {step === 'generating' && (
                    <div className="text-center py-12 animate-pulse">
                        <div className="text-4xl mb-4 flex justify-center"><Brain size={48} className="text-emerald-400" /></div>
                        <p className="text-emerald-200">{t('analyzing')}</p>
                        <p className="text-xs text-emerald-400">{t('preparingPlan')}</p>
                    </div>
                )}

                {step === 'result' && plan && (
                    <div className="animate-fade-in">
                        <div className="bg-white/10 p-4 rounded-lg mb-6 backdrop-blur-sm border border-white/10">
                            <p className="italic text-lg text-emerald-100">"{plan.motivation}"</p>
                            <div className="text-xs text-emerald-300 mt-2 text-right">— {t('yourCoach')}</div>
                        </div>

                        <h4 className="font-bold text-emerald-200 mb-3">{t('workoutOptions')}</h4>
                        <div className="space-y-3">
                            {plan.workouts.map((w, i) => (
                                <div key={i} className="bg-black/20 p-3 rounded hover:bg-black/30 transition-colors cursor-pointer border border-transparent hover:border-emerald-500/50">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-white">{w.type}</span>
                                        <span className="text-xs bg-emerald-500/20 px-2 py-1 rounded text-emerald-200">{w.duration}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 line-clamp-1">
                                        {Array.isArray(w.exercises) ? w.exercises.join(', ') : w.exercises}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setStep('checkin')}
                            className="mt-6 text-xs text-emerald-400 hover:text-white underline w-full text-center"
                        >
                            {t('updateCheckin')}
                        </button>
                    </div>
                )}
            </div>

            {/* Background Blob */}
            <div className="absolute top-[-50%] right-[-50%] w-full h-full bg-teal-600/20 blur-3xl rounded-full"></div>
        </div>
    );
}
