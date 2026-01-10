'use client';

import { useState, useEffect } from 'react';
import { Heart, Sparkles, Brain, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
    const [notes, setNotes] = useState('');

    // Result State
    const [plan, setPlan] = useState<AiResponse | null>(null);

    useEffect(() => {
        checkTodayStatus();
    }, []);

    const checkTodayStatus = async () => {
        try {
            // Check if already checked in?
            const res = await fetch('/api/v2/checkin');
            const data = await res.json();

            if (data && data.sleep_hours) {
                // Already checked in, try to fetch cached plan or regenerate?
                // For simplicty, let's just show checkin form pre-filled or move to generate
                setSleep(data.sleep_hours);
                setMood(data.mood_score);
                setEnergy(data.energy_level);
                // If we persist the AI plan in DB we could fetch it. 
                // For now user triggers generation manually to get a fresh talk.
                setStep('checkin'); // Let them edit or confirm
            } else {
                setStep('checkin');
            }
        } catch (error) {
            setStep('checkin');
        }
    };

    const handleGenerate = async () => {
        setStep('generating');

        // 1. Save Check-in
        await fetch('/api/v2/checkin', {
            method: 'POST',
            body: JSON.stringify({ sleep_hours: sleep, mood_score: mood, energy_level: energy, notes })
        });

        // 2. Call AI
        try {
            const res = await fetch('/api/v2/ai/coach', { method: 'POST' });
            if (!res.ok) throw new Error('AI Error');
            const data = await res.json();
            setPlan(data);
            setStep('result');
        } catch (error) {
            alert('Connection issue. Please try again.');
            setStep('checkin');
        }
    };

    if (step === 'loading') return <div className="card h-64 animate-pulse bg-gray-800"></div>;

    return (
        <div className="card border-none bg-gradient-to-br from-emerald-900/50 to-teal-900/50 text-white relative overflow-hidden">
            <div className="relative z-10">
                <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                    <Heart className="text-emerald-300" /> {t('title')}
                </h3>
                <p className="text-sm text-emerald-200 mb-6">{t('subtitle')}</p>

                {step === 'checkin' && (
                    <div className="space-y-4 animate-fade-in">
                        <div>
                            <label className="text-xs uppercase tracking-wider text-emerald-300">{t('sleep')} ({sleep}h)</label>
                            <input
                                type="range" min="0" max="12" step="0.5"
                                value={sleep} onChange={e => setSleep(parseFloat(e.target.value))}
                                className="w-full accent-emerald-400"
                            />
                        </div>
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
