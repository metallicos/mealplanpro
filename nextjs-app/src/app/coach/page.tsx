'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Heart, Zap, Sun, Moon, Activity, Dumbbell, Sparkles, ChevronRight } from 'lucide-react';

interface CoachPlan {
    motivation: string;
    workouts: {
        type: string;
        duration: string;
        exercises: string[];
    }[];
    recommendation: string;
}

export default function CoachPage() {
    const t = useTranslations('coach');
    const [step, setStep] = useState<'loading' | 'checkin' | 'generating' | 'result'>('loading');
    const [sleep, setSleep] = useState(7);
    const [mood, setMood] = useState(7);
    const [energy, setEnergy] = useState(7);
    const [notes, setNotes] = useState('');
    const [plan, setPlan] = useState<CoachPlan | null>(null);

    useEffect(() => {
        // Check if we have today's plan cached
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

    const handleGenerate = async () => {
        setStep('generating');

        // 1. Save Check-in
        await fetch('/api/v2/checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

    if (step === 'loading') {
        return (
            <div className="animate-fade-in flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Heart className="w-12 h-12 text-emerald-400 animate-pulse mx-auto mb-4" />
                    <p className="text-gray-400">Loading your coach...</p>
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
                                min="4"
                                max="10"
                                step="0.5"
                                value={sleep}
                                onChange={(e) => setSleep(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>4h</span>
                                <span>10h</span>
                            </div>
                        </div>

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
                    <p className="text-gray-400">Preparing your personalized plan</p>
                </div>
            )}

            {step === 'result' && plan && (
                <div className="space-y-6">
                    {/* Motivation */}
                    <div className="card bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-500/20">
                        <h3 className="text-lg font-bold text-emerald-300 mb-3 flex items-center gap-2">
                            <Heart className="w-5 h-5" /> {t('todaysMotivation')}
                        </h3>
                        <p className="text-white/90 text-lg italic leading-relaxed">"{plan.motivation}"</p>
                        <p className="text-emerald-400 text-sm mt-3 text-right">— Your Coach</p>
                    </div>

                    {/* Recommendation */}
                    <div className="card bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-500/20">
                        <h3 className="text-lg font-bold text-amber-300 mb-2 flex items-center gap-2">
                            <Zap className="w-5 h-5" /> {t('todaysRecommendation')}
                        </h3>
                        <p className="text-white/80">{plan.recommendation}</p>
                    </div>

                    {/* Workouts */}
                    <div className="card">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Dumbbell className="w-5 h-5 text-blue-400" /> {t('workoutOptions')}
                        </h3>
                        <div className="grid gap-4">
                            {plan.workouts.map((workout, idx) => (
                                <div
                                    key={idx}
                                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-bold text-white flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-emerald-400" />
                                            {workout.type}
                                        </h4>
                                        <span className="text-sm text-gray-400">{workout.duration}</span>
                                    </div>
                                    <ul className="space-y-1">
                                        {workout.exercises.map((ex, i) => (
                                            <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                                <ChevronRight className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                                {ex}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Retry Button */}
                    <button
                        onClick={() => setStep('checkin')}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all border border-white/10"
                    >
                        {t('generateNewPlan')}
                    </button>
                </div>
            )}
        </div>
    );
}
