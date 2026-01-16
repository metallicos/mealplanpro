'use client';

import { useState } from 'react';
import { Target, Activity, Apple, Check, TrendingDown, Scale, Dumbbell, Sparkles, ArrowRight, Zap } from 'lucide-react';

interface OnboardingModalProps {
    isOpen: boolean;
    onComplete: () => void;
    onDismiss?: () => void;
}

export default function OnboardingModal({ isOpen, onComplete, onDismiss }: OnboardingModalProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        gender: 'male',
        activity_level: 'moderate',
        goals: 'maintain',
        dietary_restrictions: [] as string[],
        preferred_language: 'en',
        preferred_currency: 'USD'
    });

    if (!isOpen) return null;

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/v2/user/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                onComplete();
            } else {
                alert('Something went wrong saving your profile.');
            }
        } catch (e) {
            console.error(e);
            alert('Error saving profile');
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleDiet = (diet: string) => {
        setFormData(prev => {
            const current = prev.dietary_restrictions;
            if (current.includes(diet)) {
                return { ...prev, dietary_restrictions: current.filter(d => d !== diet) };
            } else {
                return { ...prev, dietary_restrictions: [...current, diet] };
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#1e1e24] w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-gradient-to-r from-cyan-500/10 to-violet-500/10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/30 transition-transform hover:scale-105">
                            {step === 1 && <Activity size={24} />}
                            {step === 2 && <Target size={24} />}
                            {step === 3 && <Sparkles size={24} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {step === 1 && "Let's Get to Know You"}
                                {step === 2 && "What's Your Mission?"}
                                {step === 3 && "Final Touches"}
                            </h2>
                            <p className="text-sm text-gray-400">Step {step} of 3 — Personalized just for you</p>
                        </div>
                    </div>
                    {/* Progress Bar with glow */}
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-500 ease-out shadow-lg shadow-cyan-500/50"
                            style={{ width: `${(step / 3) * 100}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span className={step >= 1 ? 'text-cyan-400' : ''}>Profile</span>
                        <span className={step >= 2 ? 'text-violet-400' : ''}>Goals</span>
                        <span className={step >= 3 ? 'text-emerald-400' : ''}>Preferences</span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">

                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Gender</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['male', 'female', 'other'].map(g => (
                                        <button
                                            key={g}
                                            onClick={() => updateField('gender', g)}
                                            className={`p-3 rounded-lg border text-sm capitalize transition-colors ${formData.gender === g
                                                ? 'bg-gradient-to-r from-cyan-600 to-violet-600 border-cyan-500 text-white'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                                }`}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Activity Level</label>
                                <div className="space-y-2">
                                    {[
                                        { val: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise' },
                                        { val: 'light', label: 'Lightly Active', desc: 'Light exercise 1-3 days/week' },
                                        { val: 'moderate', label: 'Moderately Active', desc: 'Moderate exercise 3-5 days/week' },
                                        { val: 'active', label: 'Very Active', desc: 'Hard exercise 6-7 days/week' }
                                    ].map(opt => (
                                        <button
                                            key={opt.val}
                                            onClick={() => updateField('activity_level', opt.val)}
                                            className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition-colors ${formData.activity_level === opt.val
                                                ? 'bg-cyan-600/20 border-cyan-500 text-white'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                                }`}
                                        >
                                            <span>
                                                <div className="font-medium text-sm">{opt.label}</div>
                                                <div className="text-xs opacity-70">{opt.desc}</div>
                                            </span>
                                            {formData.activity_level === opt.val && <Check />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-3">Main Goal</label>
                                <div className="space-y-3">
                                    {[
                                        { val: 'lose_weight', label: 'Lose Weight', desc: 'Calorie deficit to burn fat', icon: TrendingDown },
                                        { val: 'maintain', label: 'Maintain Weight', desc: 'Keep current weight & improve health', icon: Scale },
                                        { val: 'build_muscle', label: 'Build Muscle', desc: 'Surplus for gaining lean mass', icon: Dumbbell }
                                    ].map(opt => (
                                        <button
                                            key={opt.val}
                                            onClick={() => updateField('goals', opt.val)}
                                            className={`w-full p-4 rounded-xl border text-left transition-all ${formData.goals === opt.val
                                                ? 'bg-gradient-to-r from-cyan-600 to-violet-600 text-white border-transparent shadow-lg shadow-cyan-500/20'
                                                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                                                }`}
                                        >
                                            <div className="font-bold flex items-center gap-2">
                                                <opt.icon size={18} /> {opt.label}
                                            </div>
                                            <div className="text-sm opacity-80 mt-1">{opt.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-3">Dietary Preferences</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Gluten-Free', 'Dairy-Free', 'Nut-Free'].map(diet => (
                                        <button
                                            key={diet}
                                            onClick={() => toggleDiet(diet)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${formData.dietary_restrictions.includes(diet)
                                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                                }`}
                                        >
                                            {diet}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Language</label>
                                    <select
                                        value={formData.preferred_language}
                                        onChange={(e) => updateField('preferred_language', e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                    >
                                        <option value="en">English</option>
                                        <option value="fr">Français</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Currency</label>
                                    <select
                                        value={formData.preferred_currency}
                                        onChange={(e) => updateField('preferred_currency', e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-violet-500"
                                    >
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                        <option value="MAD">MAD (DH)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-black/20">
                    <div className="flex justify-between items-center">
                        {step > 1 ? (
                            <button
                                onClick={handleBack}
                                className="text-gray-400 hover:text-white text-sm"
                            >
                                Back
                            </button>
                        ) : (
                            <div></div>
                        )}

                        {step < 3 ? (
                            <button
                                onClick={handleNext}
                                className="px-6 py-2 rounded-lg bg-white text-black font-semibold hover:bg-gray-200 transition-colors"
                            >
                                Next
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-violet-600 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? 'Saving...' : 'Finish Setup'}
                            </button>
                        )}
                    </div>
                    {onDismiss && (
                        <button
                            onClick={onDismiss}
                            className="w-full mt-4 text-center text-sm text-gray-500 hover:text-gray-300 transition-colors"
                        >
                            I'll do this later
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
