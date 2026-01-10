'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function WaterTracker() {
    const t = useTranslations('dashboard');
    const [totalMl, setTotalMl] = useState(0);
    const [goalMl, setGoalMl] = useState(2500);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchWater();
    }, []);

    const fetchWater = async () => {
        try {
            const res = await fetch('/api/v2/water');
            if (res.ok) {
                const data = await res.json();
                setTotalMl(data.total_ml);
                setGoalMl(data.goal_ml);
            }
        } catch (error) {
            console.error('Failed to fetch water:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const addWater = async (amount: number) => {
        // Optimistic update
        const oldTotal = totalMl;
        setTotalMl(prev => prev + amount);

        try {
            const res = await fetch('/api/v2/water', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount_ml: amount })
            });
            if (!res.ok) throw new Error('Failed');
        } catch (err) {
            setTotalMl(oldTotal); // Revert
            alert('Failed to save water log');
        }
    };

    const percentage = Math.min((totalMl / goalMl) * 100, 100);

    if (isLoading) return <div className="card animate-pulse h-40"></div>;

    return (
        <div className="card relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-none bg-gradient-to-br from-blue-900/40 to-slate-900/40 backdrop-blur-md text-white">

            <div className="absolute top-0 left-0 w-full h-1 bg-blue-900/30">
                <div
                    className="h-full bg-blue-500 transition-all duration-1000 ease-out"
                    style={{ width: `${percentage}%` }}
                />
            </div>

            <div className="flex items-start justify-between mb-4 gap-2">
                <div className="min-w-0 flex-1">
                    <h3 className="flex items-center gap-2 font-semibold text-base sm:text-lg text-blue-100">
                        {/* Droplet SVG */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 flex-shrink-0"><path d="M12 22a7 7 0 0 0 7-7c0-2-2-3-2-3q-3-3-5-6c-2 3-5 6-5 6s-2 1-2 3a7 7 0 0 0 7 7z" /></svg>
                        <span className="truncate">{t('hydration')}</span>
                    </h3>
                    <p className="text-xs text-blue-300/80 truncate">{t('dailyGoal')}: {goalMl}ml</p>
                </div>
                <div className="text-right flex-shrink-0">
                    <span className="text-xl sm:text-2xl font-bold tracking-tight">{totalMl}</span>
                    <span className="text-sm text-blue-300 ml-1">ml</span>
                </div>
            </div>

            {/* Circular Visualization or simple bar? Let's do a wave effect in the background later. For now, clean buttons */}

            <div className="grid grid-cols-3 gap-2 mt-4">
                <button
                    onClick={() => addWater(250)}
                    className="flex flex-col items-center justify-center p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 transition-all hover:scale-105 active:scale-95"
                >
                    <span className="text-xs font-medium text-blue-200">+250ml</span>
                    <span className="text-[10px] text-blue-400">{t('glass')}</span>
                </button>
                <button
                    onClick={() => addWater(500)}
                    className="flex flex-col items-center justify-center p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 transition-all hover:scale-105 active:scale-95"
                >
                    <span className="text-xs font-medium text-blue-200">+500ml</span>
                    <span className="text-[10px] text-blue-400">{t('bottle')}</span>
                </button>
                <button
                    onClick={() => addWater(750)}
                    className="flex flex-col items-center justify-center p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 transition-all hover:scale-105 active:scale-95"
                >
                    <span className="text-xs font-medium text-blue-200">+750ml</span>
                    <span className="text-[10px] text-blue-400">{t('jug')}</span>
                </button>
            </div>
        </div>
    );
}
