'use client';

import { useUser } from '@/contexts/UserContext';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import SmartPlan from '@/components/SmartPlan';

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
  const [randomMeals, setRandomMeals] = useState<Recipe[]>([]);
  const [mealsLoading, setMealsLoading] = useState(true);
  const [stats, setStats] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [familyRefreshTrigger, setFamilyRefreshTrigger] = useState(0);

  // Use targets from user settings
  const targets = {
    calories: settings.dailyCalorieTarget,
    protein: settings.proteinTarget,
    carbs: settings.carbsTarget,
    fat: settings.fatTarget,
  };

  useEffect(() => {
    // Fetch random meals from API (Healthy Only)
    setMealsLoading(true);
    fetch('/api/recipes/random?count=6&healthy=true')
      .then(res => res.json())
      .then(data => {
        setRandomMeals(data.recipes || []);
      })
      .catch(err => console.error('Failed to fetch meals:', err))
      .finally(() => setMealsLoading(false));
  }, []);

  const getImageUrl = (meal: Recipe) => {
    if (meal.local_image_path) {
      return `/images/recipes/${meal.local_image_path.replace('images/', '')}`;
    }
    return meal.image_url || '/images/placeholder.png';
  };

  if (isLoading || !user) return <div className="p-8 text-center">Loading dashboard...</div>;

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="page-title">Welcome back, {user.fullName}! 👋</h1>
        <p className="page-subtitle">Track your macros, hit your goals, and crush your fat loss journey.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* ... stats cards ... */}
        <div className="stat-card">
          <div className="text-4xl mb-2">🔥</div>
          <div className="stat-value">{stats.calories}</div>
          <div className="stat-label">Calories Today</div>
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
            Target: {targets.calories}
          </div>
        </div>

        <div className="stat-card">
          <div className="text-4xl mb-2">💪</div>
          <div className="stat-value">{stats.protein}g</div>
          <div className="stat-label">Protein</div>
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
            Target: {targets.protein}g
          </div>
        </div>

        <div className="stat-card">
          <div className="text-4xl mb-2">🍚</div>
          <div className="stat-value">{stats.carbs}g</div>
          <div className="stat-label">Carbs</div>
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
            Target: {targets.carbs}g
          </div>
        </div>

        <div className="stat-card">
          <div className="text-4xl mb-2">🥑</div>
          <div className="stat-value">{stats.fat}g</div>
          <div className="stat-label">Fat</div>
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
            Target: {targets.fat}g
          </div>
        </div>
      </div>

      {/* Master User: Family Management */}
      {user.role === 'master' && (
        <div className="card mb-6 border-violet-500/30 bg-violet-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-semibold">My Family Members 👨‍👩‍👧‍👦</h3>
              <p className="text-sm text-[var(--text-secondary)]">Manage your household accounts</p>
            </div>
            <button
              onClick={() => setShowFamilyModal(true)}
              className="btn-primary w-full sm:w-auto"
            >
              + Add Member
            </button>
          </div>

          <FamilyList refreshTrigger={familyRefreshTrigger} />
        </div>
      )}

      {/* Quick Actions */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link href="/macros" className="btn-primary text-center">
            <span>➕</span> Log Food
          </Link>
          <Link href="/calculator" className="btn-secondary text-center">
            <span>🔢</span> Calculate Calories
          </Link>
          <Link href="/statistics" className="btn-secondary text-center">
            <span>📊</span> View Progress
          </Link>
          <Link href="/meals" className="btn-secondary text-center">
            <span>📚</span> Browse Meals
          </Link>
          <Link href="/groceries" className="btn-secondary text-center">
            <span>🛒</span> Grocery List
          </Link>
          <Link href="/community" className="btn-secondary text-center border-violet-500/50">
            <span>💬</span> Community
          </Link>
        </div>
      </div>

      {/* Smart Daily Plan */}
      <SmartPlan />

      {/* Meal Ideas */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Meal Ideas for You 🍽️</h2>
          <Link href="/meals" className="text-sm" style={{ color: theme.primary }}>
            View All →
          </Link>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          International variety - tasty, high-protein, and budget-friendly options.
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
                  <div className="absolute top-2 left-2 z-10 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg">
                    🥗 Healthy
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
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                  >
                    🍽️
                  </div>
                )}
                <div className="meal-card-content">
                  <div className="meal-card-title group-hover:text-[var(--accent-primary)] transition-colors">{meal.title}</div>
                  <div className="meal-card-meta">
                    <span className="capitalize">📂 {meal.category?.replace(/-/g, ' ')}</span>
                    <span>⏱️ {meal.prep_time || 'N/A'}</span>
                  </div>
                  <div className="meal-card-macros">
                    <div>
                      <div className="macro-value" style={{ color: 'var(--calories)' }}>{meal.kcal}</div>
                      <div className="macro-label">kcal</div>
                    </div>
                    <div>
                      <div className="macro-value" style={{ color: 'var(--protein)' }}>{meal.protein}g</div>
                      <div className="macro-label">Protein</div>
                    </div>
                    <div>
                      <div className="macro-value" style={{ color: 'var(--carbs)' }}>{meal.carbs}g</div>
                      <div className="macro-label">Carbs</div>
                    </div>
                    <div>
                      <div className="macro-value" style={{ color: 'var(--fat)' }}>{meal.fat}g</div>
                      <div className="macro-label">Fat</div>
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
        <h3 className="text-lg font-semibold mb-2">🍋 Daily Ginger Energy Shot</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Boost metabolism and energy before breaking your fast
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><strong>Fresh ginger:</strong> 20g</div>
          <div><strong>Lemon juice:</strong> 10ml</div>
          <div><strong>Water:</strong> 20ml</div>
          <div><strong>Honey (opt):</strong> 3g</div>
        </div>
        <p className="text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
          <strong>Tip:</strong> Make 7 shots, freeze in ice cube tray. Thaw one daily!
        </p>
      </div>

      {/* Add Member Modal */}
      {showFamilyModal && (
        <FamilyModal
          onClose={() => setShowFamilyModal(false)}
          onSuccess={() => {
            setFamilyRefreshTrigger(prev => prev + 1);
            setShowFamilyModal(false);
          }}
        />
      )}
    </div>
  );
}

// Sub-components for better organization

function FamilyList({ refreshTrigger }: { refreshTrigger: number }) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/family')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMembers(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [refreshTrigger]);

  if (loading) return <div className="text-sm text-gray-400">Loading family...</div>;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
      {members.map(member => (
        <div
          key={member.id}
          className="flex-shrink-0 w-40 sm:w-auto p-2 sm:p-3 rounded-lg bg-[var(--bg-secondary)] flex items-center gap-2"
        >
          <div className="text-xl sm:text-2xl">
            {member.role === 'master' ? '👑' : '👤'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm sm:text-base flex items-center gap-1 truncate">
              {member.full_name}
              {member.role === 'master' && (
                <span className="text-[10px] sm:text-xs bg-yellow-500/20 text-yellow-500 px-1 rounded">Master</span>
              )}
            </div>
            <div className="text-[10px] sm:text-xs text-[var(--text-muted)] truncate">{member.email}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FamilyModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to add member');

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-sm animate-fade-in relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">✕</button>
        <h3 className="text-lg font-bold mb-4">Add Family Member</h3>

        {error && <div className="bg-red-500/20 text-red-500 p-2 rounded text-sm mb-3">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="form-label">Full Name</label>
            <input
              className="form-input w-full"
              value={formData.fullName}
              onChange={e => setFormData({ ...formData, fullName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input w-full"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input w-full"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>
          <button
            type="submit"
            className="btn-primary w-full mt-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add Member'}
          </button>
        </form>
      </div>
    </div>
  );
}
