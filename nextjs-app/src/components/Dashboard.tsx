'use client';

import { useUser } from '@/contexts/UserContext';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import SmartPlan from '@/components/SmartPlan';
import WaterTracker from '@/components/WaterTracker';
import FastingTimer from '@/components/FastingTimer';
import OnboardingController from '@/components/OnboardingController';
import {
  Flame,
  Dumbbell,
  Wheat,
  Droplet,
  Plus,
  Calculator,
  BarChart3,
  BookOpen,
  ShoppingCart,
  MessageCircle,
  Users,
  Utensils,
  Crown,
  User,
  Clock,
  FolderOpen,
  Leaf,
  Apple,
  Sparkles,
  Heart,
  X,
  Scan
} from 'lucide-react';

interface Recipe {
  id: number;
  title: string;
  description: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string;
  subcategory: string;
  prep_time: string;
  serves: string;
  image_url: string;
  local_image_path: string;
  isHealthy: boolean;
}

export default function Dashboard() {
  const { user, theme, settings, isLoading } = useUser();
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const tFamily = useTranslations('family');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const [randomMeals, setRandomMeals] = useState<Recipe[]>([]);
  const [mealsLoading, setMealsLoading] = useState(true);
  const [stats, setStats] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  // Use targets from user settings
  const targets = {
    calories: settings.dailyCalorieTarget,
    protein: settings.proteinTarget,
    carbs: settings.carbsTarget,
    fat: settings.fatTarget,
  };

  useEffect(() => {
    // 1. Fetch Random Meals
    setMealsLoading(true);
    fetch(`/api/recipes/random?count=6&healthy=true&lang=${locale}`)
      .then(res => res.json())
      .then(data => setRandomMeals(data.recipes || []))
      .catch(err => console.error(err))
      .finally(() => setMealsLoading(false));

    // 2. Fetch Daily Stats
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

    if (user) {
      fetch(`/api/logs?date=${today}`)
        .then(res => res.json())
        .then(data => {
          if (data.logs) {
            const totals = data.logs.reduce((acc: any, log: any) => ({
              calories: acc.calories + (log.calories || 0),
              protein: acc.protein + (log.protein || 0),
              carbs: acc.carbs + (log.carbs || 0),
              fat: acc.fat + (log.fat || 0),
            }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

            setStats({
              calories: Math.round(totals.calories),
              protein: Math.round(totals.protein),
              carbs: Math.round(totals.carbs),
              fat: Math.round(totals.fat)
            });
          }
        })
        .catch(err => console.error('Failed to fetch stats:', err));
    }
  }, [user, locale]);

  const getImageUrl = (meal: Recipe) => {
    if (meal.image_url) {
      return meal.image_url;
    }
    if (meal.local_image_path) {
      return `/images/recipes/${meal.local_image_path.replace('images/', '')}`;
    }
    return '/images/placeholder.png';
  };

  if (isLoading || !user) return <div className="p-8 text-center">{t('loadingDashboard')}</div>;

  return (
    <div className="animate-fade-in relative min-h-screen">
      {/* Ambient Backgrounds */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-teal-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[40%] w-[400px] h-[400px] bg-cyan-600/5 rounded-full blur-[100px]" />
      </div>

      <OnboardingController />
      <div className="mb-8">
        <h1 className="page-title">{t('welcomeBack', { name: user.fullName })}</h1>
        <p className="page-subtitle">
          {settings.goal.includes('loss')
            ? t('trackMacrosDescLoss')
            : settings.goal.includes('gain')
              ? t('trackMacrosDescGain')
              : t('trackMacrosDescMaintain')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* ... stats cards ... */}
        <div className="stat-card">
          <div className="text-4xl mb-2 flex justify-center"><Flame className="w-10 h-10 text-red-500" /></div>
          <div className="stat-value">{stats.calories}</div>
          <div className="stat-label">{t('caloriesToday')}</div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min((stats.calories / targets.calories) * 100, 100)}%`,
                background: 'var(--calories)'
              }}
            />
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('target')}: {targets.calories}
          </div>
        </div>

        <div className="stat-card">
          <div className="text-4xl mb-2 flex justify-center"><Dumbbell className="w-10 h-10 text-blue-500" /></div>
          <div className="stat-value">{stats.protein}g</div>
          <div className="stat-label">{t('protein')}</div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min((stats.protein / targets.protein) * 100, 100)}%`,
                background: 'var(--protein)'
              }}
            />
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('target')}: {targets.protein}g
          </div>
        </div>

        <div className="stat-card">
          <div className="text-4xl mb-2 flex justify-center"><Wheat className="w-10 h-10 text-amber-500" /></div>
          <div className="stat-value">{stats.carbs}g</div>
          <div className="stat-label">{t('carbs')}</div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min((stats.carbs / targets.carbs) * 100, 100)}%`,
                background: 'var(--carbs)'
              }}
            />
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('target')}: {targets.carbs}g
          </div>
        </div>

        <div className="stat-card">
          <div className="text-4xl mb-2 flex justify-center"><Droplet className="w-10 h-10 text-purple-500" /></div>
          <div className="stat-value">{stats.fat}g</div>
          <div className="stat-label">{t('fat')}</div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min((stats.fat / targets.fat) * 100, 100)}%`,
                background: 'var(--fat)'
              }}
            />
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('target')}: {targets.fat}g
          </div>
        </div>
      </div>

      {/* Scanners Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Link
          href="/macros?scan=true"
          className="card hover:border-emerald-500/50 transition-colors group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex items-center gap-4 p-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Apple size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">{tNav('macros')} Scanner</h3>
              <p className="text-xs text-gray-400">{t('trackMacrosDescMaintain')}</p>
            </div>
            <div className="ml-auto bg-white/10 p-2 rounded-full">
              <Scan size={20} />
            </div>
          </div>
        </Link>

        <Link
          href="/groceries?scan=true"
          className="card hover:border-purple-500/50 transition-colors group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex items-center gap-4 p-2">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <Sparkles size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Home & Health Scanner</h3>
              <p className="text-xs text-gray-400">Cosmetics, Household & more</p>
            </div>
            <div className="ml-auto bg-white/10 p-2 rounded-full">
              <Scan size={20} />
            </div>
          </div>
        </Link>
      </div>

      {/* V2 Health Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <WaterTracker />
        <FastingTimer />
      </div>

      {/* Quick Actions */}
      <div className="card mb-6 hidden md:block">
        <h3 className="text-lg font-semibold mb-4">{t('quickActions')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link href="/coach" className="btn-primary text-center justify-center bg-gradient-to-r from-emerald-600 to-teal-600 border-none shadow-lg shadow-emerald-500/20">
            <Heart size={18} /> {tNav('coach')}
          </Link>
          <Link href="/macros" className="btn-secondary text-center justify-center">
            <Plus size={18} /> {t('logFood')}
          </Link>
          <Link href="/calculator" className="btn-secondary text-center justify-center">
            <Calculator size={18} /> {t('calculateCalories')}
          </Link>
          <Link href="/statistics" className="btn-secondary text-center justify-center">
            <BarChart3 size={18} /> {t('viewProgress')}
          </Link>
          <Link href="/meals" className="btn-secondary text-center justify-center">
            <BookOpen size={18} /> {t('browseMeals')}
          </Link>
          <Link href="/groceries" className="btn-secondary text-center justify-center">
            <ShoppingCart size={18} /> {t('groceryList')}
          </Link>
          <Link href="/community" className="btn-secondary text-center border-emerald-500/50 justify-center">
            <MessageCircle size={18} /> {t('community')}
          </Link>
        </div>
      </div>

      {/* Smart Daily Plan */}
      <SmartPlan />

      {/* Meal Ideas */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">{t('mealIdeas')} <Utensils size={20} /></h2>
          <Link href="/meals" className="text-sm" style={{ color: theme.primary }}>
            {t('viewAll')} →
          </Link>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          {t('mealIdeasDesc')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mealsLoading ? (
            // Loading skeletons
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="meal-card animate-pulse">
                <div className="meal-card-image bg-gray-700" />
                <div className="meal-card-content">
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            ))
          ) : (
            randomMeals.map((meal) => (
              <Link href={`/meals/${meal.id}`} key={meal.id} className="meal-card relative block group">
                {/* Healthy Badge */}
                {meal.isHealthy && (
                  <div className="absolute top-2 left-2 z-10 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg flex items-center gap-1">
                    <Leaf size={12} /> {t('healthy')}
                  </div>
                )}
                {getImageUrl(meal) ? (
                  <div
                    className="meal-card-image transition-transform duration-500 group-hover:scale-105"
                    style={{
                      backgroundImage: `url(${getImageUrl(meal)})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  />
                ) : (
                  <div
                    className="meal-card-image"
                    style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}
                  >
                    <Utensils size={32} className="text-white/80" />
                  </div>
                )}
                <div className="meal-card-content">
                  <div className="meal-card-title group-hover:text-[var(--accent-primary)] transition-colors">{meal.title}</div>
                  <div className="meal-card-meta">
                    <span className="capitalize flex items-center gap-1"><FolderOpen size={12} /> {meal.category?.replace(/-/g, ' ')}</span>
                    <span title={meal.prep_time} className="flex items-center gap-1"><Clock size={12} /> {meal.prep_time ? (meal.prep_time.length > 20 ? meal.prep_time.substring(0, 18) + '...' : meal.prep_time) : 'N/A'}</span>
                  </div>
                  <div className="meal-card-macros">
                    <div>
                      <div className="macro-value" style={{ color: 'var(--calories)' }}>{meal.kcal}</div>
                      <div className="macro-label">{tCommon('kcal')}</div>
                    </div>
                    <div>
                      <div className="macro-value" style={{ color: 'var(--protein)' }}>{meal.protein}g</div>
                      <div className="macro-label">{t('protein')}</div>
                    </div>
                    <div>
                      <div className="macro-value" style={{ color: 'var(--carbs)' }}>{meal.carbs}g</div>
                      <div className="macro-label">{t('carbs')}</div>
                    </div>
                    <div>
                      <div className="macro-value" style={{ color: 'var(--fat)' }}>{meal.fat}g</div>
                      <div className="macro-label">{t('fat')}</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Ginger Shot Recipe */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(234, 88, 12, 0.1))',
          borderColor: 'rgba(245, 158, 11, 0.3)'
        }}
      >
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Apple size={20} className="text-amber-400" /> {t('gingerShot')}
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          {t('gingerShotDesc')}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><strong>{t('freshGinger')}:</strong> 20g</div>
          <div><strong>{t('lemonJuice')}:</strong> 10ml</div>
          <div><strong>{t('water')}:</strong> 20ml</div>
          <div><strong>{t('honeyOptional')}:</strong> 3g</div>
        </div>
        <p className="text-sm mt-4 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <Sparkles size={14} className="text-amber-500" />
          <span><strong>{t('tip')}:</strong> {t('gingerTip')}</span>
        </p>
      </div>

    </div>
  );
}

// Sub-components for better organization


