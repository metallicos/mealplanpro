'use client';

import { useState, useEffect } from 'react';
import {
    Heart, Brain, Zap, Dumbbell, PersonStanding, Waves, Bike,
    Target, Swords, Footprints, Flame, StretchHorizontal, Mountain,
    Home, TreePine, Building2, Check
} from 'lucide-react';
import { useTranslations } from 'next-intl';

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
    const [sportType, setSportType] = useState('hiit');
    const [location, setLocation] = useState('gym');
    const [equipment, setEquipment] = useState<string[]>([]);
    const [notes, setNotes] = useState('');

    // Get sports available for current location
    const availableSports = SPORTS.filter(s => s.locations.includes(location));

    // Handle location change - reset sport if not available
    const handleLocationChange = (newLocation: string) => {
        setLocation(newLocation);
        const currentSportValid = SPORTS.find(s => s.id === sportType)?.locations.includes(newLocation);
        if (!currentSportValid) {
            // Set first available sport for new location
            const firstAvailable = SPORTS.find(s => s.locations.includes(newLocation));
            if (firstAvailable) setSportType(firstAvailable.id);
        }
    };

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
            if (!res.ok) {
                if (res.status === 429) {
                    alert(t('coachBusy')); // Or minimal toast
                    setStep('checkin');
                    return;
                }
                throw new Error('AI Error');
            }
            const data = await res.json();
            setPlan(data);
            setStep('result');
        } catch (error) {
            console.error(error);
            setStep('checkin');
        }
    };

    if (step === 'loading') return <div className="card h-full animate-pulse bg-slate-800 rounded-3xl min-h-[350px]"></div>;

    return (
        <div className="card h-full flex flex-col justify-between bg-[#0F172A] border border-emerald-500/10 shadow-xl relative overflow-hidden rounded-2xl p-4">
            <div className="relative z-10 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Heart className="text-emerald-400 fill-emerald-400/20" size={16} />
                        {t('title')}
                    </h3>
                    <p className="text-[10px] text-slate-500">{t('subtitle')}</p>
                </div>

                {step === 'checkin' && (
                    <div className="space-y-4 flex-1">
                        {/* Row 1: Vitals (Sleep, Mood, Energy) */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-800/30 p-2 rounded-xl border border-slate-700/50">
                            {/* Sleep */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[8px] font-bold uppercase tracking-wider text-slate-400">
                                    <label>{t('sleep')}</label>
                                    <span className="text-emerald-400">{sleep}h</span>
                                </div>
                                <input
                                    type="range" min="0" max="12" step="0.5"
                                    value={sleep} onChange={e => setSleep(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                            </div>
                            {/* Mood */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[8px] font-bold uppercase tracking-wider text-slate-400">
                                    <label>{t('mood')}</label>
                                    <span className="text-emerald-400">{mood}</span>
                                </div>
                                <input
                                    type="range" min="1" max="10"
                                    value={mood} onChange={e => setMood(parseInt(e.target.value))}
                                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                            </div>
                            {/* Energy */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[8px] font-bold uppercase tracking-wider text-slate-400">
                                    <label>{t('energy')}</label>
                                    <span className="text-emerald-400">{energy}</span>
                                </div>
                                <input
                                    type="range" min="1" max="10"
                                    value={energy} onChange={e => setEnergy(parseInt(e.target.value))}
                                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Row 2: Location & Sport */}
                        <div className="flex gap-2">
                            {/* Location Selector (Vertical compact) */}
                            <div className="flex-1 space-y-1">
                                <label className="text-[8px] uppercase font-bold tracking-wider text-slate-500 ml-1">{t('trainingLocation')}</label>
                                <div className="grid grid-cols-3 gap-1 bg-slate-800/30 p-1 rounded-lg">
                                    {LOCATIONS.map(loc => (
                                        <button
                                            key={loc.id}
                                            onClick={() => handleLocationChange(loc.id)}
                                            className={`p-1.5 rounded-md flex justify-center transition-all ${location === loc.id
                                                ? 'bg-emerald-500 text-white shadow'
                                                : 'text-slate-400 hover:bg-slate-700/50'
                                                }`}
                                            title={t(`locations.${loc.id}`)}
                                        >
                                            <loc.Icon size={14} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Generate Button (Right side) */}
                            <button
                                onClick={handleGenerate}
                                className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex flex-col items-center justify-center gap-1 group"
                            >
                                <Zap size={18} className="fill-white/20 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] uppercase tracking-wider">{t('generatePlan')}</span>
                            </button>
                        </div>

                        {/* Sport Type Scrollable/Grid */}
                        <div className="space-y-1">
                            <label className="text-[8px] uppercase font-bold tracking-wider text-slate-500 ml-1">{t('sportType')}</label>
                            <div className="grid grid-cols-6 gap-1.5">
                                {availableSports.slice(0, 12).map(sport => (
                                    <button
                                        key={sport.id}
                                        onClick={() => setSportType(sport.id)}
                                        className={`aspect-square rounded-lg flex items-center justify-center transition-all ${sportType === sport.id
                                            ? 'bg-emerald-500 text-white shadow-md'
                                            : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
                                            }`}
                                        title={t(`sports.${sport.id}`)}
                                    >
                                        <sport.Icon size={14} strokeWidth={2} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Equipment (Collapsible, only for home) */}
                        {location === 'home' && (
                            <div className="animate-fade-in-down">
                                <div className="flex flex-wrap gap-1.5 h-12 overflow-y-auto pr-1 custom-scrollbar">
                                    {EQUIPMENT.map(item => (
                                        <button
                                            key={item}
                                            onClick={() => toggleEquipment(item)}
                                            className={`px-2 py-1 rounded-md text-[9px] font-medium border transition-all ${equipment.includes(item)
                                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                                                : 'bg-slate-800/50 border-slate-700 text-slate-500'
                                                }`}
                                        >
                                            {t(`equipment.${item}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {step === 'generating' && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center animate-pulse min-h-[200px]">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20">
                            <Brain size={24} className="text-emerald-400 animate-bounce" />
                        </div>
                        <h4 className="text-emerald-100 font-bold text-sm mb-1">{t('analyzing')}</h4>
                        <p className="text-xs text-slate-500">{t('preparingPlan')}</p>
                    </div>
                )}

                {step === 'result' && plan && (
                    <div className="flex-1 animate-fade-in flex flex-col h-full">
                        <div className="bg-emerald-900/20 p-3 rounded-xl mb-3 border border-emerald-500/10 flex gap-3 items-start">
                            <div className="bg-emerald-500/10 p-1.5 rounded-full shrink-0">
                                <Brain size={14} className="text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-emerald-100 italic leading-relaxed">"{plan.motivation}"</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2 max-h-[160px]">
                            {plan.workouts.map((w, i) => (
                                <div key={i} className="bg-slate-800/40 p-3 rounded-lg border border-transparent hover:border-emerald-500/20">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-1.5 h-1.5 rounded-full ${w.type === 'Cardio' ? 'bg-orange-400' : w.type === 'Strength' ? 'bg-emerald-500' : 'bg-blue-400'}`}></span>
                                            <span className="font-bold text-slate-200 text-xs">{w.type}</span>
                                        </div>
                                        <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">
                                            {w.duration}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-normal pl-3 border-l border-slate-700">
                                        {Array.isArray(w.exercises) ? w.exercises.join(' • ') : w.exercises}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setStep('checkin')}
                            className="mt-3 py-2 text-[10px] font-bold text-slate-400 hover:text-emerald-400 uppercase tracking-widest w-full text-center border-t border-slate-800/50"
                        >
                            {t('updateCheckin')}
                        </button>
                    </div>
                )}
            </div>

            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 blur-[50px] rounded-full pointer-events-none"></div>
        </div>
    );
}
