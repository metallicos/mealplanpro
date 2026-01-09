'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SmartMeal {
    id: number;
    title: string;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    image_url: string;
    local_image_path: string;
    prep_time: string;
    slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    isHealthy: boolean;
}

export default function SmartPlan() {
    const [plan, setPlan] = useState<SmartMeal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPlan = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/smart-meals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: new Date().toISOString().split('T')[0] })
            });
            const data = await res.json();

            if (!res.ok) {
                if (res.status === 404) {
                    setError('Set your goals in Profile to get a personalized plan!');
                } else {
                    throw new Error(data.error || 'Failed to load plan');
                }
            } else {
                setPlan(data.meals || []);
            }
        } catch (err) {
            console.error(err);
            setError('Could not generate plan. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlan();
    }, []);

    const getSlotEmoji = (slot: string) => {
        switch (slot) {
            case 'breakfast': return '🍳';
            case 'lunch': return '🥗';
            case 'dinner': return '🍽️';
            case 'snack': return '🍎';
            default: return '🥘';
        }
    };

    const getImageUrl = (meal: SmartMeal) => {
        if (meal.image_url) {
            return meal.image_url;
        }
        if (meal.local_image_path) {
            return `/images/recipes/${meal.local_image_path.replace('images/', '')}`;
        }
        return '/images/placeholder.png';
    };

    if (loading) return <div className="card animate-pulse h-64 bg-gray-800/50 mb-8" />;

    if (error) {
        return (
            <div className="card mb-8 border-yellow-500/20 bg-yellow-500/5 text-center py-8">
                <div className="text-3xl mb-2">📊</div>
                <p className="mb-4 text-yellow-200">{error}</p>
                <Link href="/profile" className="btn-primary inline-block">
                    Go to Profile
                </Link>
            </div>
        );
    }

    if (plan.length === 0) return null;

    return (
        <div className="mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                    ✨ Your Smart Plan for Today
                </h2>
                <button onClick={fetchPlan} className="text-xs btn-secondary">
                    🔄 Regenerate
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {['breakfast', 'lunch', 'dinner', 'snack'].map(slot => {
                    const meal = plan.find(p => p.slot === slot);
                    if (!meal) return null;

                    return (
                        <Link href={`/meals/${meal.id}`} key={meal.id} className="meal-card group block h-full">
                            <div className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur-md text-white text-xs px-2 py-1 rounded font-bold uppercase tracking-wider">
                                {getSlotEmoji(slot)} {slot}
                            </div>

                            {(meal.image_url || meal.local_image_path) ? (
                                <div
                                    className="meal-card-image transition-transform duration-500 group-hover:scale-105"
                                    style={{ backgroundImage: `url(${getImageUrl(meal)})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                                />
                            ) : (
                                <div className="meal-card-image flex items-center justify-center bg-gray-800 text-4xl">
                                    {getSlotEmoji(slot)}
                                </div>
                            )}

                            <div className="meal-card-content relative bg-[var(--bg-primary)]">
                                <h4 className="font-bold truncate mb-2 group-hover:text-[var(--accent-primary)] transition-colors">{meal.title}</h4>
                                <div className="flex justify-between text-xs text-gray-400 mb-2">
                                    <span>{meal.kcal} kcal</span>
                                    <span>{meal.protein}g P</span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
