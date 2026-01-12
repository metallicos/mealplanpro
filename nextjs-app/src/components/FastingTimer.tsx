'use client';

import { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Scientific Stages Data
const STAGES = [
    { hours: 0, name: 'Anabolic Phase', desc: 'Body using stored energy', color: 'text-gray-300' },
    { hours: 4, name: 'Catabolic Phase', desc: 'Blood sugar falls', color: 'text-blue-300' },
    { hours: 12, name: 'Ketosis', desc: 'Fat burning mode activated', color: 'text-orange-400' },
    { hours: 16, name: 'Autophagy', desc: 'Cellular repair begins', color: 'text-green-400' },
    { hours: 24, name: 'Peak HGH', desc: 'Growth hormone surge', color: 'text-purple-400' },
];

export default function FastingTimer() {
    const t = useTranslations('fasting');
    const [isFasting, setIsFasting] = useState(false);
    const [startTime, setStartTime] = useState<string | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [goalHours, setGoalHours] = useState(16);

    useEffect(() => {
        // Fetch status
        fetch('/api/v2/fasting')
            .then(res => res.json())
            .then(data => {
                if (data.activeFast) {
                    setIsFasting(true);
                    setStartTime(data.activeFast.start_time);
                    setGoalHours(data.activeFast.goal_hours || 16);
                }
            });
    }, []);

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

    const handleToggle = async () => {
        const action = isFasting ? 'STOP' : 'START';

        try {
            const res = await fetch('/api/v2/fasting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, goal_hours: goalHours })
            });

            if (res.ok) {
                const data = await res.json();
                if (action === 'START') {
                    setIsFasting(true);
                    setStartTime(data.start_time);
                } else {
                    setIsFasting(false);
                    setStartTime(null);
                }
            }
        } catch (error) {
            console.error('Fasting error:', error);
        }
    };

    // Calculate current stage
    const elapsedHours = elapsedSeconds / 3600;
    const currentStage = STAGES.slice().reverse().find(s => elapsedHours >= s.hours) || STAGES[0];
    const progressPercent = Math.min((elapsedHours / goalHours) * 100, 100);

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="card relative overflow-hidden bg-gradient-to-br from-emerald-900/40 to-slate-900/40 backdrop-blur-md text-white border-none">
            {/* Progress Bar Background */}
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-900/30">
                <div
                    className="h-full bg-emerald-500 transition-all duration-1000"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            <div className="flex items-center justify-between gap-4 p-1">
                {/* Left: Timer & Status */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Timer className="w-4 h-4 text-emerald-400" />
                        <h3 className="font-semibold text-sm text-emerald-100">{t('fastingTimer')}</h3>
                        {isFasting && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 ${currentStage.color}`}>
                                {currentStage.name}
                            </span>
                        )}
                    </div>

                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-mono font-bold tracking-tight">
                            {isFasting ? formatTime(elapsedSeconds) : 'Ready'}
                        </span>
                        <span className="text-xs text-slate-400">
                            / {goalHours}h {t('goal').toLowerCase()}
                        </span>
                    </div>
                </div>

                {/* Right: Action Button */}
                <button
                    onClick={handleToggle}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${isFasting
                        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'text-white shadow-lg'
                        }`}
                    style={!isFasting ? { background: 'var(--accent-primary)' } : {}}
                >
                    {isFasting ? t('endFast') : t('startFast')}
                </button>
            </div>

            {!isFasting && (
                <p className="text-[10px] text-slate-500 mt-2 pl-1 leading-tight">{t('readyToStart')}</p>
            )}
        </div>
    );
}
