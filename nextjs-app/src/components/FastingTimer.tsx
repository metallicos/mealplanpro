'use client';

import { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

// Scientific Stages Data
const STAGES = [
    { hours: 0, name: 'Anabolic Phase', desc: 'Body using stored energy', color: 'text-gray-300' },
    { hours: 4, name: 'Catabolic Phase', desc: 'Blood sugar falls', color: 'text-blue-300' },
    { hours: 12, name: 'Ketosis', desc: 'Fat burning mode activated', color: 'text-orange-400' },
    { hours: 16, name: 'Autophagy', desc: 'Cellular repair begins', color: 'text-green-400' },
    { hours: 24, name: 'Peak HGH', desc: 'Growth hormone surge', color: 'text-purple-400' },
];

export default function FastingTimer() {
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
        <div className="card relative overflow-hidden bg-gradient-to-br from-emerald-900/40 to-slate-900/40 backdrop-blur-md text-white border-none h-full flex flex-col justify-between">
            {/* Progress Bar Background */}
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-900/30">
                <div
                    className="h-full bg-emerald-500 transition-all duration-1000"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            <div>
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-emerald-100">
                        {/* Timer Icon SVG */}
                        <Timer className="w-5 h-5 text-emerald-400" />
                        Fasting Timer
                    </h3>
                    <div className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Goal: {goalHours}h
                    </div>
                </div>

                <div className="text-center py-4">
                    <div className="text-4xl font-mono font-bold tracking-wider mb-2">
                        {isFasting ? formatTime(elapsedSeconds) : '--:--:--'}
                    </div>
                    {isFasting ? (
                        <div className="animate-fade-in">
                            <p className={`font-medium ${currentStage.color}`}>{currentStage.name}</p>
                            <p className="text-xs text-slate-400">{currentStage.desc}</p>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400">Ready to start your fast?</p>
                    )}
                </div>
            </div>

            <button
                onClick={handleToggle}
                className={`w-full py-3 rounded-lg font-medium transition-all ${isFasting
                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    }`}
            >
                {isFasting ? 'End Fast' : 'Start Fasting'}
            </button>
        </div>
    );
}
