'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import {
    Calculator,
    ArrowRight,
    CheckCircle2,
    Sparkles,
    Utensils,
    Dumbbell,
    Brain,
    Globe,
    TrendingUp,
    User,
    LogIn,
    UserPlus
} from 'lucide-react';

export default function LandingPage() {
    const t = useTranslations('landing');
    const tLang = useTranslations('languages');
    const locale = useLocale();

    const [formData, setFormData] = useState({
        gender: 'female',
        age: 25,
        height: 165,
        weight: 70,
        activity: 'sedentary',
        goal: 'maintain'
    });

    const [result, setResult] = useState<{
        tdee: number;
        target: number;
        label: string;
    } | null>(null);

    const [showLangMenu, setShowLangMenu] = useState(false);
    const [showAuthMenu, setShowAuthMenu] = useState(false);

    const switchLanguage = async (newLocale: string) => {
        await fetch('/api/locale', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locale: newLocale }),
        });
        setShowLangMenu(false);
        window.location.reload();
    };

    const calculate = () => {
        const { gender, age, height, weight, activity, goal } = formData;

        // Mifflin-St Jeor
        let bmr = (10 * weight) + (6.25 * height) - (5 * age) + (gender === 'male' ? 5 : -161);

        const activityMultipliers: Record<string, number> = {
            sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
        };
        const tdee = Math.round(bmr * (activityMultipliers[activity] || 1.2));

        const goalMultipliers: Record<string, number> = {
            loss: 0.80, maintain: 1.0, gain: 1.10
        };

        // Simplified goal mapping
        let targetMultiplier = 1.0;
        let label = 'Maintenance';

        if (goal.includes('loss')) {
            targetMultiplier = 0.8;
            label = 'Fat Loss';
        } else if (goal.includes('gain')) {
            targetMultiplier = 1.1;
            label = 'Muscle Gain';
        }

        const target = Math.round(tdee * targetMultiplier);

        setResult({ tdee, target, label });
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-[#050507] text-white selection:bg-cyan-500/30">

            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] bg-emerald-600/10 rounded-full blur-[120px]" />
                <div className="absolute top-[30%] left-[50%] -translate-x-1/2 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]" />
            </div>

            {/* Navbar */}
            <nav className="relative z-50 container mx-auto px-4 md:px-6 py-4 md:py-6 flex items-center justify-between pt-[calc(1rem+env(safe-area-inset-top))]">
                <div className="flex items-center gap-2 font-bold text-lg md:text-xl tracking-tight">
                    <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white">
                        <Utensils size={18} />
                    </div>
                    <span>MealPlan<span className="text-cyan-400">Pro</span></span>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                    {/* Language Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowLangMenu(!showLangMenu)}
                            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <Globe size={20} />
                        </button>

                        {showLangMenu && (
                            <div className="absolute top-full right-0 mt-2 w-32 bg-[#12121a] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                                <button
                                    onClick={() => switchLanguage('en')}
                                    className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition-colors ${locale === 'en' ? 'text-cyan-400 font-medium' : 'text-gray-400'}`}
                                >
                                    English
                                </button>
                                <button
                                    onClick={() => switchLanguage('fr')}
                                    className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition-colors ${locale === 'fr' ? 'text-cyan-400 font-medium' : 'text-gray-400'}`}
                                >
                                    Français
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="h-6 w-px bg-white/10 mx-1 md:mx-2 hidden sm:block" />

                    {/* Auth Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowAuthMenu(!showAuthMenu)}
                            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <User size={20} />
                        </button>

                        {showAuthMenu && (
                            <div className="absolute top-full right-0 mt-2 w-40 bg-[#12121a] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                                <Link
                                    href="/login"
                                    className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3"
                                >
                                    <LogIn size={16} />
                                    {locale === 'fr' ? 'Connexion' : 'Log In'}
                                </Link>
                                <Link
                                    href="/signup"
                                    className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3"
                                >
                                    <UserPlus size={16} />
                                    {locale === 'fr' ? 'Inscription' : 'Sign Up'}
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="relative z-10 container mx-auto px-6 py-12 lg:py-20 flex flex-col lg:flex-row items-center gap-16">

                {/* Text Content */}
                <div className="flex-1 text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-6 animate-fade-in">
                        <Sparkles size={12} /> {locale === 'fr' ? 'Nutrition par IA' : 'AI-Powered Nutrition'}
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 animate-slide-up">
                        {t('titlePart1')}<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-teal-400">
                            {t('titlePart2')}
                        </span>
                    </h1>
                    <p className="text-lg text-gray-400 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed animate-slide-up delay-100">
                        {t('description')}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-center lg:justify-start animate-slide-up delay-200">
                        <Link href="/signup" className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-bold text-lg hover:scale-105 transition-transform shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2">
                            {t('ctaStart')} <ArrowRight size={20} />
                        </Link>
                        <a href="#calculator" className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold flex items-center justify-center gap-2 transition-colors">
                            <Calculator size={20} /> {t('ctaCalc')}
                        </a>
                    </div>

                    <div className="mt-10 flex gap-6 justify-center lg:justify-start text-xs text-gray-500 animate-fade-in delay-300">
                        <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> {t('noCreditCard')}</div>
                        <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> {t('cancelAnytime')}</div>
                    </div>
                </div>

                {/* Calculator Card */}
                <div id="calculator" className="flex-1 w-full max-w-md animate-slide-in-right delay-200">
                    <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-xl bg-[#12121a]/80">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-emerald-500" />

                        {!result ? (
                            <>
                                <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                                    <Calculator className="text-cyan-400" /> {t('calculator.title')}
                                </h3>
                                <p className="text-gray-400 text-sm mb-6">{t('calculator.desc')}</p>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 mb-1 block">{t('calculator.gender')}</label>
                                            <div className="flex bg-[#0a0a0f] rounded-lg p-1 border border-white/5">
                                                <button
                                                    onClick={() => setFormData({ ...formData, gender: 'male' })}
                                                    className={`flex-1 py-2 text-sm rounded-md transition-colors ${formData.gender === 'male' ? 'bg-gray-800 text-white font-medium shadow' : 'text-gray-400 hover:text-white'}`}
                                                >{t('calculator.male')}</button>
                                                <button
                                                    onClick={() => setFormData({ ...formData, gender: 'female' })}
                                                    className={`flex-1 py-2 text-sm rounded-md transition-colors ${formData.gender === 'female' ? 'bg-gray-800 text-white font-medium shadow' : 'text-gray-400 hover:text-white'}`}
                                                >{t('calculator.female')}</button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 mb-1 block">{t('calculator.age')}</label>
                                            <input
                                                type="number"
                                                className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-cyan-500 transition-colors"
                                                value={formData.age}
                                                onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 mb-1 block">{t('calculator.height')}</label>
                                            <input
                                                type="number"
                                                className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-cyan-500 transition-colors"
                                                value={formData.height}
                                                onChange={e => setFormData({ ...formData, height: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-gray-500 mb-1 block">{t('calculator.weight')}</label>
                                            <input
                                                type="number"
                                                className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-cyan-500 transition-colors"
                                                value={formData.weight}
                                                onChange={e => setFormData({ ...formData, weight: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">{t('calculator.activity')}</label>
                                        <select
                                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-cyan-500 transition-colors text-sm appearance-none"
                                            value={formData.activity}
                                            onChange={e => setFormData({ ...formData, activity: e.target.value })}
                                        >
                                            <option value="sedentary">{t('calculator.activitySedentary')}</option>
                                            <option value="light">{t('calculator.activityLight')}</option>
                                            <option value="moderate">{t('calculator.activityModerate')}</option>
                                            <option value="active">{t('calculator.activityActive')}</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">{t('calculator.goal')}</label>
                                        <select
                                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-cyan-500 transition-colors text-sm appearance-none"
                                            value={formData.goal}
                                            onChange={e => setFormData({ ...formData, goal: e.target.value })}
                                        >
                                            <option value="loss">{t('calculator.goalLoss')}</option>
                                            <option value="maintain">{t('calculator.goalMaintain')}</option>
                                            <option value="gain">{t('calculator.goalGain')}</option>
                                        </select>
                                    </div>

                                    <button
                                        onClick={calculate}
                                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold hover:shadow-lg hover:shadow-cyan-500/25 transition-all active:scale-[0.98] mt-4"
                                    >
                                        {t('calculator.calculateBtn')}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="animate-fade-in text-center">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-emerald-400">
                                    <TrendingUp size={32} />
                                </div>
                                <h3 className="text-2xl font-bold mb-1">{t('results.title')}</h3>
                                <p className="text-gray-400 text-sm mb-6">{t('results.targetDesc', { age: formData.age, weight: formData.weight, height: formData.height })}</p>

                                <div className="bg-[#0a0a0f] rounded-2xl p-6 border border-white/5 mb-6">
                                    <div className="text-sm text-gray-400 uppercase tracking-widest font-bold mb-1">{result.label}</div>
                                    <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2">
                                        {result.target.toLocaleString()}
                                    </div>
                                    <div className="text-sm text-gray-500">{t('results.dailyCalories')}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="p-3 bg-white/5 rounded-xl">
                                        <div className="text-xs text-gray-400">{t('results.maintenance')}</div>
                                        <div className="text-lg font-bold">{result.tdee.toLocaleString()}</div>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-xl">
                                        <div className="text-xs text-gray-400">{t('results.metabolicAge')}</div>
                                        <div className="text-lg font-bold">{Math.max(18, formData.age - 5)}</div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Link
                                        href={`/signup?kcal=${result.target}&goal=${formData.goal}`}
                                        className="block w-full py-4 rounded-xl bg-white text-black font-bold hover:bg-gray-100 transition-colors shadow-lg active:scale-[0.98]"
                                    >
                                        {t('results.unlock')}
                                    </Link>
                                    <button
                                        onClick={() => setResult(null)}
                                        className="block w-full py-3 text-sm text-gray-400 hover:text-white"
                                    >
                                        {t('results.recalculate')}
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-4">
                                    {t('results.signupText')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* How It Works Section */}
            <div className="container mx-auto px-6 py-20 border-t border-white/5">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        {locale === 'fr' ? 'Comment ça marche ?' : 'How It Works'}
                    </h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        {locale === 'fr'
                            ? 'Commencez votre transformation en 3 étapes simples'
                            : 'Start your transformation in 3 simple steps'}
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Step 1 */}
                    <div className="relative text-center group">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg shadow-cyan-500/25 group-hover:scale-110 transition-transform">
                            1
                        </div>
                        <h3 className="text-xl font-bold mb-3">{locale === 'fr' ? 'Créez votre compte' : 'Create Account'}</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            {locale === 'fr'
                                ? 'Inscrivez-vous gratuitement et définissez vos objectifs personnels'
                                : 'Sign up for free and set your personal goals'}
                        </p>
                    </div>
                    {/* Step 2 */}
                    <div className="relative text-center group">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform">
                            2
                        </div>
                        <h3 className="text-xl font-bold mb-3">{locale === 'fr' ? 'Suivez vos repas' : 'Track Your Meals'}</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            {locale === 'fr'
                                ? "Scannez les codes-barres ou recherchez les aliments pour un suivi facile"
                                : 'Scan barcodes or search foods for easy tracking'}
                        </p>
                    </div>
                    {/* Step 3 */}
                    <div className="relative text-center group">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg shadow-purple-500/25 group-hover:scale-110 transition-transform">
                            3
                        </div>
                        <h3 className="text-xl font-bold mb-3">{locale === 'fr' ? 'Atteignez vos objectifs' : 'Reach Your Goals'}</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            {locale === 'fr'
                                ? "Suivez vos progrès et laissez l'IA vous guider vers le succès"
                                : 'Follow your progress and let AI guide you to success'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Counter Section */}
            <div className="container mx-auto px-6 py-16">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                        <div className="text-3xl md:text-4xl font-bold text-cyan-400 mb-2">10K+</div>
                        <div className="text-sm text-gray-400">{locale === 'fr' ? 'Repas suivis' : 'Meals Tracked'}</div>
                    </div>
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                        <div className="text-3xl md:text-4xl font-bold text-emerald-400 mb-2">5K+</div>
                        <div className="text-sm text-gray-400">{locale === 'fr' ? 'Utilisateurs actifs' : 'Active Users'}</div>
                    </div>
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                        <div className="text-3xl md:text-4xl font-bold text-purple-400 mb-2">98%</div>
                        <div className="text-sm text-gray-400">{locale === 'fr' ? 'Satisfaction' : 'Satisfaction'}</div>
                    </div>
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                        <div className="text-3xl md:text-4xl font-bold text-amber-400 mb-2">24/7</div>
                        <div className="text-sm text-gray-400">{locale === 'fr' ? 'Coach IA' : 'AI Coach'}</div>
                    </div>
                </div>
            </div>

            {/* Features Preview */}
            <div className="container mx-auto px-6 py-20 border-t border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 mx-auto md:mx-0">
                            <Brain size={24} />
                        </div>
                        <h4 className="text-xl font-bold mb-2">{t('aiCoach')}</h4>
                        <p className="text-gray-400 text-sm leading-relaxed">{t('aiCoachDesc')}</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 mx-auto md:mx-0">
                            <Utensils size={24} />
                        </div>
                        <h4 className="text-xl font-bold mb-2">{t('smartMeals')}</h4>
                        <p className="text-gray-400 text-sm leading-relaxed">{t('smartMealsDesc')}</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 mb-4 mx-auto md:mx-0">
                            <Dumbbell size={24} />
                        </div>
                        <h4 className="text-xl font-bold mb-2">{t('workouts')}</h4>
                        <p className="text-gray-400 text-sm leading-relaxed">{t('workoutsDesc')}</p>
                    </div>
                </div>
            </div>

            {/* Newsletter Section */}
            <div className="container mx-auto px-6 py-16 border-t border-white/5">
                <div className="max-w-2xl mx-auto text-center">
                    <h5 className="text-2xl md:text-3xl font-bold mb-3">
                        {locale === 'fr' ? 'Restez informé' : 'Stay in the Loop'}
                    </h5>
                    <p className="text-gray-400 text-sm mb-8">
                        {locale === 'fr'
                            ? 'Recevez des conseils nutrition, des recettes saines et des mises à jour produit directement dans votre boîte mail.'
                            : 'Get nutrition tips, healthy recipes, and product updates delivered to your inbox.'}
                    </p>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            alert(locale === 'fr' ? 'Merci de votre inscription !' : 'Thanks for subscribing!');
                        }}
                        className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
                    >
                        <input
                            type="email"
                            required
                            placeholder={locale === 'fr' ? 'Votre email' : 'Your email address'}
                            className="flex-1 bg-[#12121a] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500 transition-colors"
                        />
                        <button
                            type="submit"
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-bold hover:scale-105 transition-transform whitespace-nowrap"
                        >
                            {locale === 'fr' ? "S'inscrire" : 'Subscribe'}
                        </button>
                    </form>
                    <p className="text-xs text-gray-600 mt-4">
                        {locale === 'fr'
                            ? 'Pas de spam. Désabonnez-vous à tout moment.'
                            : 'No spam. Unsubscribe anytime.'}
                    </p>
                </div>
            </div>

            {/* Footer */}
            <footer className="container mx-auto px-6 py-12 lg:py-16 border-t border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
                    {/* Brand */}
                    <div>
                        <div className="flex items-center gap-2 font-bold text-xl mb-4">
                            <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white">
                                <Utensils size={18} />
                            </div>
                            <span>MealPlan<span className="text-cyan-400">Pro</span></span>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            {locale === 'fr'
                                ? 'Votre compagnon nutrition intelligent pour atteindre vos objectifs santé.'
                                : 'Your intelligent nutrition companion for achieving your health goals.'}
                        </p>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h6 className="font-semibold mb-4 text-gray-300">
                            {locale === 'fr' ? 'Légal' : 'Legal'}
                        </h6>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="/privacy-policy" className="text-gray-400 hover:text-white transition-colors">
                                    {locale === 'fr' ? 'Politique de confidentialité' : 'Privacy Policy'}
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                                    {locale === 'fr' ? "Conditions d'utilisation" : 'Terms of Service'}
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                                    {locale === 'fr' ? 'Nous contacter' : 'Contact Us'}
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Mobile Apps */}
                    <div>
                        <h6 className="font-semibold mb-4 text-gray-300">{t('mobile.title')}</h6>
                        <div className="flex flex-col gap-3">
                            <button className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group">
                                <span className="text-xl"><AppleIcon /></span>
                                <div className="text-left">
                                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('mobile.comingSoon')}</div>
                                    <div className="font-bold text-sm">{t('mobile.apple')}</div>
                                </div>
                            </button>
                            <button className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group">
                                <span className="text-xl"><AndroidIcon /></span>
                                <div className="text-left">
                                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t('mobile.comingSoon')}</div>
                                    <div className="font-bold text-sm">{t('mobile.android')}</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/5 text-center text-xs text-gray-600">
                    © {new Date().getFullYear()} MealPlan Pro. All rights reserved.
                </div>
            </footer>

        </div>
    );
}

// Simple icons for the footer
function AppleIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
    )
}

function AndroidIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
        </svg>
    )
}
