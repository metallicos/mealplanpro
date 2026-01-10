'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
    Timer, Clock, Zap, Heart, Brain, Sparkles,
    ChevronRight, Play, Pause, RotateCcw, Info,
    TrendingUp, Award, Calendar, Check, X, Flame
} from 'lucide-react';

// Fasting Protocol Definitions
const PROTOCOLS = [
    {
        id: '12-12',
        name: '12:12 Beginner',
        fasting: 12,
        eating: 12,
        difficulty: 'Easy',
        color: 'emerald',
        description: 'Perfect for beginners. Fast for 12 hours overnight, eat during 12 hours.',
        benefits: ['Improved digestion', 'Better sleep quality', 'Gentle introduction to fasting'],
        example: 'Stop eating at 8pm, resume at 8am'
    },
    {
        id: '16-8',
        name: '16:8 Lean Gains',
        fasting: 16,
        eating: 8,
        difficulty: 'Moderate',
        color: 'teal',
        description: 'Most popular protocol. Skip breakfast, eat lunch and dinner.',
        benefits: ['Fat burning (ketosis)', 'Improved insulin sensitivity', 'Easier calorie control'],
        example: 'Stop eating at 8pm, resume at 12pm next day'
    },
    {
        id: '18-6',
        name: '18:6 Warrior Prep',
        fasting: 18,
        eating: 6,
        difficulty: 'Challenging',
        color: 'purple',
        description: 'Extended fat burning. One main meal plus a snack.',
        benefits: ['Deep ketosis', 'Cellular autophagy begins', 'Enhanced mental clarity'],
        example: 'Eat between 12pm and 6pm only'
    },
    {
        id: '20-4',
        name: '20:4 Warrior',
        fasting: 20,
        eating: 4,
        difficulty: 'Advanced',
        color: 'rose',
        description: 'One large meal per day with a small snack window.',
        benefits: ['Maximum autophagy', 'Growth hormone boost', 'Significant fat loss'],
        example: 'Eat between 2pm and 6pm only'
    },
    {
        id: '24',
        name: '24h Full Fast',
        fasting: 24,
        eating: 0,
        difficulty: 'Expert',
        color: 'amber',
        description: 'Complete 24-hour fast, done 1-2 times per week.',
        benefits: ['Deep cellular repair', 'Immune system reset', 'Peak growth hormone'],
        example: 'Dinner to dinner fast'
    }
];

// Scientific Stages Data
const STAGES = [
    { hours: 0, name: 'stages_fed', desc: 'stages_fed.desc', color: 'text-gray-400', icon: '🍽️' },
    { hours: 4, name: 'stages_early', desc: 'stages_early.desc', color: 'text-blue-400', icon: '📉' },
    { hours: 8, name: 'stages_fat_burning', desc: 'stages_fat_burning.desc', color: 'text-orange-400', icon: '🔥' },
    { hours: 12, name: 'stages_ketosis', desc: 'stages_ketosis.desc', color: 'text-amber-400', icon: '⚡' },
    { hours: 16, name: 'stages_autophagy', desc: 'stages_autophagy.desc', color: 'text-emerald-400', icon: '🔄' },
    { hours: 18, name: 'stages_deep_autophagy', desc: 'stages_deep_autophagy.desc', color: 'text-teal-400', icon: '✨' },
    { hours: 24, name: 'stages_growth_hormone', desc: 'stages_growth_hormone.desc', color: 'text-purple-400', icon: '💪' },
];

export default function FastingPage() {
    const t = useTranslations('fasting');
    const [activeTab, setActiveTab] = useState<'timer' | 'protocols' | 'history'>('timer');
    const [selectedProtocol, setSelectedProtocol] = useState(PROTOCOLS[1]); // 16:8 default
    const [isFasting, setIsFasting] = useState(false);
    const [startTime, setStartTime] = useState<string | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    // History state
    const [history, setHistory] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        // Fetch current fasting status
        fetch('/api/v2/fasting')
            .then(res => res.json())
            .then(data => {
                if (data.activeFast) {
                    setIsFasting(true);
                    setStartTime(data.activeFast.start_time);
                    // Find matching protocol
                    const protocol = PROTOCOLS.find(p => p.fasting === data.activeFast.goal_hours);
                    if (protocol) setSelectedProtocol(protocol);
                }
            })
            .catch(err => console.error(err));
    }, []);

    // Fetch history when tab changes to history
    useEffect(() => {
        if (activeTab === 'history' && history.length === 0) {
            setLoadingHistory(true);
            fetch('/api/v2/fasting/history')
                .then(res => res.json())
                .then(data => {
                    setHistory(data.history || []);
                    setStats(data.stats || null);
                })
                .catch(err => console.error(err))
                .finally(() => setLoadingHistory(false));
        }
    }, [activeTab, history.length]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isFasting && startTime) {
            interval = setInterval(() => {
                const start = new Date(startTime).getTime();
                const now = new Date().getTime();
                setElapsedSeconds(Math.floor((now - start) / 1000));
            }, 1000);
        } else {
            setElapsedSeconds(0);
        }
        return () => clearInterval(interval);
    }, [isFasting, startTime]);

    const handleStartFast = async () => {
        try {
            const res = await fetch('/api/v2/fasting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'START', goal_hours: selectedProtocol.fasting })
            });
            if (res.ok) {
                const data = await res.json();
                setIsFasting(true);
                setStartTime(data.start_time);
            }
        } catch (error) {
            console.error('Failed to start fast:', error);
        }
    };

    const handleEndFast = async () => {
        try {
            const res = await fetch('/api/v2/fasting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'STOP' })
            });
            if (res.ok) {
                setIsFasting(false);
                setStartTime(null);
                setElapsedSeconds(0);
            }
        } catch (error) {
            console.error('Failed to end fast:', error);
        }
    };

    // Calculate progress
    const elapsedHours = elapsedSeconds / 3600;
    const progressPercent = Math.min((elapsedHours / selectedProtocol.fasting) * 100, 100);
    const currentStage = STAGES.slice().reverse().find(s => elapsedHours >= s.hours) || STAGES[0];
    const nextStage = STAGES.find(s => s.hours > elapsedHours);

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return { hours: h, minutes: m, seconds: s };
    };

    const time = formatTime(elapsedSeconds);
    const remainingSeconds = Math.max(selectedProtocol.fasting * 3600 - elapsedSeconds, 0);
    const remaining = formatTime(remainingSeconds);

    const getColorClass = (color: string, type: 'bg' | 'text' | 'border' = 'bg') => {
        const colors: Record<string, Record<string, string>> = {
            emerald: { bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500' },
            teal: { bg: 'bg-teal-500', text: 'text-teal-400', border: 'border-teal-500' },
            purple: { bg: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500' },
            rose: { bg: 'bg-rose-500', text: 'text-rose-400', border: 'border-rose-500' },
            amber: { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500' },
        };
        return colors[color]?.[type] || colors.emerald[type];
    };

    return (
        <div className="animate-fade-in min-h-screen pb-20">
            {/* Hero Header */}
            <div className="relative mb-8 py-8 px-4 rounded-3xl overflow-hidden bg-gradient-to-br from-purple-900/40 to-slate-900/60 border border-purple-500/20">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-600/20 via-transparent to-transparent"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
                        <Timer className="w-8 h-8 text-purple-400" />
                        {t('title')}
                    </h1>
                    <p className="text-gray-400 max-w-2xl">
                        {t('subtitle')}
                    </p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {[
                    { id: 'timer', label: t('timer'), icon: Timer },
                    { id: 'protocols', label: t('protocols'), icon: Clock },
                    { id: 'history', label: t('history'), icon: Calendar }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                            : 'bg-[var(--bg-secondary)] text-gray-400 hover:text-white hover:bg-[var(--bg-tertiary)]'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Timer Tab */}
            {activeTab === 'timer' && (
                <div className="space-y-6">
                    {/* Main Timer Card */}
                    <div className="card bg-gradient-to-br from-purple-900/30 to-slate-900/50 border-purple-500/20 overflow-hidden">
                        {/* Progress Ring Container */}
                        <div className="flex flex-col items-center py-8">
                            {/* Circular Progress */}
                            <div className="relative w-64 h-64 mb-6">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    {/* Background Circle */}
                                    <circle
                                        cx="50" cy="50" r="45"
                                        fill="none"
                                        stroke="rgba(139, 92, 246, 0.1)"
                                        strokeWidth="8"
                                    />
                                    {/* Progress Circle */}
                                    <circle
                                        cx="50" cy="50" r="45"
                                        fill="none"
                                        stroke="url(#progressGradient)"
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        strokeDasharray={`${progressPercent * 2.83} 283`}
                                        className="transition-all duration-1000"
                                    />
                                    <defs>
                                        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#8b5cf6" />
                                            <stop offset="100%" stopColor="#06b6d4" />
                                        </linearGradient>
                                    </defs>
                                </svg>

                                {/* Center Content */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <div className="text-5xl font-mono font-bold tracking-tight">
                                        {isFasting ? (
                                            <>
                                                <span className="text-white">{time.hours.toString().padStart(2, '0')}</span>
                                                <span className="text-purple-400">:</span>
                                                <span className="text-white">{time.minutes.toString().padStart(2, '0')}</span>
                                                <span className="text-purple-400 text-3xl">:{time.seconds.toString().padStart(2, '0')}</span>
                                            </>
                                        ) : (
                                            <span className="text-gray-500">00:00</span>
                                        )}
                                    </div>
                                    {isFasting && (
                                        <div className="text-sm text-gray-400 mt-2">
                                            {remaining.hours}h {remaining.minutes}m remaining
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Current Stage */}
                            {isFasting && (
                                <div className="text-center mb-6 animate-fade-in">
                                    <div className={`text-xl font-bold ${currentStage.color}`}>
                                        {t(currentStage.name)}
                                    </div>
                                    <p className="text-gray-400 text-sm">{t(currentStage.desc)}</p>
                                    {nextStage && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            {t('nextStage')}: {t(nextStage.name)} in {Math.ceil(nextStage.hours - elapsedHours)}h
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Protocol Indicator */}
                            <div className={`px-4 py-2 rounded-full ${getColorClass(selectedProtocol.color, 'bg')}/20 ${getColorClass(selectedProtocol.color, 'text')} text-sm font-medium mb-6`}>
                                {t(selectedProtocol.name)} ({selectedProtocol.fasting}:{selectedProtocol.eating})
                            </div>

                            {/* Action Button */}
                            {isFasting ? (
                                <button
                                    onClick={handleEndFast}
                                    className="flex items-center gap-2 px-8 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl font-medium transition-all border border-red-500/30"
                                >
                                    <Pause size={20} /> {t('endFast')}
                                </button>
                            ) : (
                                <button
                                    onClick={handleStartFast}
                                    className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/25"
                                >
                                    <Play size={20} /> {t('startFast')}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stages Timeline */}
                    <div className="card">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <TrendingUp size={20} className="text-purple-400" />
                            Fasting Stages
                        </h3>
                        <div className="space-y-3">
                            {STAGES.map((stage, i) => (
                                <div
                                    key={i}
                                    className={`flex items-center gap-4 p-3 rounded-xl transition-all ${elapsedHours >= stage.hours
                                        ? 'bg-purple-500/10 border border-purple-500/20'
                                        : 'bg-[var(--bg-secondary)] opacity-50'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${elapsedHours >= stage.hours ? 'bg-purple-500/20' : 'bg-gray-800'
                                        }`}>
                                        {stage.hours}h
                                    </div>
                                    <div className="flex-1">
                                        <div className={`font-medium ${elapsedHours >= stage.hours ? stage.color : 'text-gray-500'}`}>
                                            {t(stage.name)}
                                        </div>
                                        <div className="text-xs text-gray-500">{t(stage.desc)}</div>
                                    </div>
                                    {elapsedHours >= stage.hours && (
                                        <div className="text-emerald-400">
                                            <Sparkles size={16} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Protocols Tab */}
            {activeTab === 'protocols' && (
                <div className="space-y-4">
                    <div className="card bg-purple-500/5 border-purple-500/20 mb-6">
                        <div className="flex items-start gap-3">
                            <Info size={20} className="text-purple-400 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-purple-200">Choose Your Protocol</h4>
                                <p className="text-sm text-gray-400">
                                    Select a fasting protocol that matches your experience level and goals. Start easy and progress gradually.
                                </p>
                            </div>
                        </div>
                    </div>

                    {PROTOCOLS.map((protocol) => (
                        <div
                            key={protocol.id}
                            onClick={() => setSelectedProtocol(protocol)}
                            className={`card cursor-pointer transition-all ${selectedProtocol.id === protocol.id
                                ? `border-2 ${getColorClass(protocol.color, 'border')} bg-${protocol.color}-500/5`
                                : 'hover:border-gray-600'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className={`text-xl font-bold ${getColorClass(protocol.color, 'text')}`}>
                                        {t(protocol.name)}
                                    </h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-sm text-gray-400">
                                            {protocol.fasting}h fast : {protocol.eating}h eat
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${getColorClass(protocol.color, 'bg')}/20 ${getColorClass(protocol.color, 'text')}`}>
                                            {t(protocol.difficulty)}
                                        </span>
                                    </div>
                                </div>
                                {selectedProtocol.id === protocol.id && (
                                    <div className={`w-6 h-6 rounded-full ${getColorClass(protocol.color, 'bg')} flex items-center justify-center`}>
                                        <Sparkles size={14} className="text-white" />
                                    </div>
                                )}
                            </div>

                            <p className="text-gray-400 text-sm mb-4">{protocol.description}</p>

                            <div className="bg-[var(--bg-secondary)] rounded-lg p-3 mb-3">
                                <div className="text-xs text-gray-500 mb-1">{t('example')}</div>
                                <div className="text-sm text-gray-300">{protocol.example}</div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {protocol.benefits.map((benefit, i) => (
                                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-[var(--bg-tertiary)] text-gray-400">
                                        {benefit}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className="space-y-6">
                    {loadingHistory ? (
                        <div className="card text-center py-12">
                            <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p className="text-gray-400">{t('loading')}</p>
                        </div>
                    ) : (
                        <>
                            {/* Stats Cards */}
                            {stats && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="card text-center">
                                        <Flame className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                                        <div className="text-2xl font-bold">{stats.streak}</div>
                                        <div className="text-xs text-gray-400">{t('streak')}</div>
                                    </div>
                                    <div className="card text-center">
                                        <Award className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                                        <div className="text-2xl font-bold">{stats.longestFast}h</div>
                                        <div className="text-xs text-gray-400">{t('longestFast')}</div>
                                    </div>
                                    <div className="card text-center">
                                        <TrendingUp className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                        <div className="text-2xl font-bold">{stats.averageFast}h</div>
                                        <div className="text-xs text-gray-400">{t('averageFast')}</div>
                                    </div>
                                    <div className="card text-center">
                                        <Calendar className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                                        <div className="text-2xl font-bold">{stats.totalFasts}</div>
                                        <div className="text-xs text-gray-400">{t('totalFasts')}</div>
                                    </div>
                                </div>
                            )}

                            {/* History List */}
                            <div className="card">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-emerald-400" />
                                    {t('history')}
                                </h3>
                                {history.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400">
                                        <Timer className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>{t('noHistory')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {history.map((fast, i) => (
                                            <div key={fast.id || i} className="p-4 bg-black/20 rounded-xl border border-white/5 flex items-center justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {fast.goal_achieved ? (
                                                            <Check className="w-4 h-4 text-emerald-500" />
                                                        ) : (
                                                            <X className="w-4 h-4 text-red-500" />
                                                        )}
                                                        <span className="font-medium">
                                                            {Math.round(fast.duration_hours * 10) / 10}h / {fast.goal_hours}h
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        {new Date(fast.start_time).toLocaleDateString()} - {new Date(fast.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-xs ${fast.goal_achieved ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                                                    {fast.goal_achieved ? t('completed') : t('incomplete')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
