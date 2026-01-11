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

    if (step === 'loading') return <div className="card h-full animate-pulse bg-slate-800 rounded-3xl min-h-[500px]"></div>;

    return (
        <div className="card h-full flex flex-col justify-between bg-[#0F172A] border border-emerald-500/10 shadow-xl relative overflow-hidden rounded-3xl">
            <div className="relative z-10 flex-1 flex flex-col p-4 sm:p-6">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Heart className="text-emerald-400 fill-emerald-400/20" size={20} />
                        {t('title')}
                    </h3>
                    <p className="text-xs text-slate-400">{t('subtitle')}</p>
                </div>

                {step === 'checkin' && (
                    <div className="space-y-6 flex-1">
                        {/* Sleep Slider */}
                        <div className="space-y-3">
                            <div className="flex justify-between text-[10px] font-bold tracking-widest text-slate-400">
                                <label className="uppercase">{t('sleep')}</label>
                                <span className="text-emerald-400">{sleep}H</span>
                            </div>
                            <input
                                type="range" min="0" max="12" step="0.5"
                                value={sleep} onChange={e => setSleep(parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
                            />
                        </div>

                        {/* Mood & Energy */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <div className="flex justify-between text-[10px] font-bold tracking-widest text-slate-400">
                                    <label className="uppercase">{t('mood')}</label>
                                    <span className="text-emerald-400">{mood}/10</span>
                                </div>
                                <input
                                    type="range" min="1" max="10"
                                    value={mood} onChange={e => setMood(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400"
                                />
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-[10px] font-bold tracking-widest text-slate-400">
                                    <label className="uppercase">{t('energy')}</label>
                                    <span className="text-emerald-400">{energy}/10</span>
                                </div>
                                <input
                                    type="range" min="1" max="10"
                                    value={energy} onChange={e => setEnergy(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400"
                                />
                            </div>
                        </div>

                        {/* Training Location - Segmented Control */}
                        <div className="space-y-3">
                            <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">{t('trainingLocation')}</label>
                            <div className="bg-slate-800/50 p-1 rounded-xl grid grid-cols-3 gap-1">
                                {LOCATIONS.map(loc => (
                                    <button
                                        key={loc.id}
                                        onClick={() => handleLocationChange(loc.id)}
                                        className={`py-2 rounded-lg text-xs font-medium flex flex-col items-center gap-1 transition-all ${location === loc.id
                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <loc.Icon size={16} />
                                        <span>{t(`locations.${loc.id}`)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Equipment (Collapsible) */}
                        {location === 'home' && (
                            <div className="space-y-3 animate-fade-in-down">
                                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">{t('availableEquipment')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {EQUIPMENT.map(item => (
                                        <button
                                            key={item}
                                            onClick={() => toggleEquipment(item)}
                                            className={`px-3 py-1.5 rounded-full text-[10px] font-medium border transition-all flex items-center gap-1 ${equipment.includes(item)
                                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                                }`}
                                        >
                                            {equipment.includes(item) && <Check size={10} />}
                                            {t(`equipment.${item}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sport Type Grid */}
                        <div className="space-y-3">
                            <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">{t('sportType')}</label>
                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                                {availableSports.map(sport => (
                                    <button
                                        key={sport.id}
                                        onClick={() => setSportType(sport.id)}
                                        className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all w-full ${sportType === sport.id
                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-105'
                                            : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                                            }`}
                                        title={t(`sports.${sport.id}`)}
                                    >
                                        <sport.Icon size={20} strokeWidth={1.5} />
                                        <span className="text-[9px] font-medium truncate w-[90%] text-center">{t(`sports.${sport.id}`)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Generate Button */}
                        <div className="mt-4 pt-4">
                            <button
                                onClick={handleGenerate}
                                className="w-full py-3.5 bg-white hover:bg-emerald-50 text-emerald-950 font-bold rounded-xl transition-all shadow-lg shadow-white/5 flex items-center justify-center gap-2 group active:scale-[0.98]"
                            >
                                <span>{t('generatePlan')}</span>
                                <Zap size={18} className="text-emerald-600 group-hover:scale-110 transition-transform" fill="currentColor" />
                            </button>
                        </div>
                    </div>
                )}

                {step === 'generating' && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center animate-pulse">
                        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20">
                            <Brain size={40} className="text-emerald-400 animate-bounce" />
                        </div>
                        <h4 className="text-emerald-100 font-bold text-lg mb-2">{t('analyzing')}</h4>
                        <p className="text-sm text-slate-400 max-w-[80%] mx-auto leading-relaxed">{t('preparingPlan')}</p>
                    </div>
                )}

                {step === 'result' && plan && (
                    <div className="flex-1 animate-fade-in flex flex-col">
                        <div className="bg-emerald-900/30 p-5 rounded-2xl mb-6 border border-emerald-500/20 relative">
                            <div className="absolute -top-3 -left-3">
                                <div className="bg-[#0F172A] p-1.5 rounded-full border border-emerald-500/20">
                                    <Brain size={16} className="text-emerald-400" />
                                </div>
                            </div>
                            <p className="text-lg font-medium text-emerald-100 leading-relaxed italic">"{plan.motivation}"</p>
                            <div className="text-[10px] text-emerald-400/60 mt-3 text-right font-bold tracking-widest uppercase">— {t('yourCoach')}</div>
                        </div>

                        <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                            <h4 className="font-bold text-white text-[10px] uppercase tracking-widest mb-2 sticky top-0 bg-[#0F172A] py-2 z-10">{t('workoutOptions')}</h4>
                            {plan.workouts.map((w, i) => (
                                <div key={i} className="group bg-slate-800/40 p-4 rounded-xl hover:bg-slate-800 transition-all border border-transparent hover:border-emerald-500/30 cursor-pointer">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${w.type === 'Cardio' ? 'bg-orange-400' : w.type === 'Strength' ? 'bg-emerald-500' : 'bg-blue-400'}`}></span>
                                            <span className="font-bold text-white text-sm">{w.type}</span>
                                        </div>
                                        <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-emerald-950 transition-colors">
                                            {w.duration}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed pl-4 border-l-2 border-slate-700 group-hover:border-emerald-500/50 transition-colors">
                                        {Array.isArray(w.exercises) ? w.exercises.join(' • ') : w.exercises}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setStep('checkin')}
                            className="mt-6 py-3 text-[10px] font-bold text-emerald-400 hover:text-white uppercase tracking-widest w-full text-center border-t border-slate-800 transition-colors"
                        >
                            {t('updateCheckin')}
                        </button>
                    </div>
                )}
            </div>

            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none"></div>
        </div>
    );
}
