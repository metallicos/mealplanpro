'use client';

import { useState } from 'react';
import { mealPlans, getMealsByCuisine } from '@/lib/meal-plans';
import type { MealPlan } from '@/lib/types';

export default function MealsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCuisine, setSelectedCuisine] = useState<string>('all');
    const [selectedMeal, setSelectedMeal] = useState<MealPlan | null>(null);

    const cuisines = ['all', ...Object.keys(getMealsByCuisine())];

    const filteredMeals = mealPlans.filter(meal => {
        const matchesSearch = meal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            meal.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCuisine = selectedCuisine === 'all' || meal.cuisine === selectedCuisine;
        return matchesSearch && matchesCuisine;
    });

    return (
        <div className="animate-fade-in">
            <div className="mb-8">
                <h1 className="page-title">Meal Library 📚</h1>
                <p className="page-subtitle">50+ international meal ideas with full nutritional info and recipes.</p>
            </div>

            {/* Search and Filter */}
            <div className="card mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search meals..."
                            className="form-input"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {cuisines.map((cuisine) => (
                            <button
                                key={cuisine}
                                onClick={() => setSelectedCuisine(cuisine)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCuisine === cuisine
                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                            >
                                {cuisine === 'all' ? 'All' : cuisine}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Results count */}
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                Showing {filteredMeals.length} meals
            </p>

            {/* Meal Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredMeals.map((meal) => (
                    <div
                        key={meal.id}
                        className="meal-card cursor-pointer"
                        onClick={() => setSelectedMeal(meal)}
                    >
                        <div
                            className="meal-card-image"
                            style={{ background: `linear-gradient(135deg, ${meal.color_from}, ${meal.color_to})` }}
                        >
                            {meal.image_emoji}
                        </div>
                        <div className="meal-card-content">
                            <div className="meal-card-title">{meal.name}</div>
                            <div className="meal-card-meta">
                                <span>🌍 {meal.cuisine}</span>
                                <span>⏱️ {meal.prep_time} min</span>
                            </div>
                            <div className="meal-card-macros">
                                <div>
                                    <div className="macro-value" style={{ color: 'var(--calories)' }}>{meal.calories}</div>
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
                    </div>
                ))}
            </div>

            {/* Meal Detail Modal */}
            {selectedMeal && (
                <div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                    onClick={() => setSelectedMeal(null)}
                >
                    <div
                        className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            className="h-32 rounded-xl flex items-center justify-center text-6xl mb-4"
                            style={{ background: `linear-gradient(135deg, ${selectedMeal.color_from}, ${selectedMeal.color_to})` }}
                        >
                            {selectedMeal.image_emoji}
                        </div>

                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-2xl font-bold">{selectedMeal.name}</h2>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selectedMeal.description}</p>
                            </div>
                            <button
                                onClick={() => setSelectedMeal(null)}
                                className="text-2xl hover:opacity-70"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex gap-4 mb-6 text-sm" style={{ color: 'var(--text-muted)' }}>
                            <span>🌍 {selectedMeal.cuisine}</span>
                            <span>⏱️ {selectedMeal.prep_time} min prep</span>
                        </div>

                        {/* Macros */}
                        <div className="grid grid-cols-4 gap-4 mb-6">
                            <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                <div className="text-2xl font-bold" style={{ color: 'var(--calories)' }}>{selectedMeal.calories}</div>
                                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Calories</div>
                            </div>
                            <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                <div className="text-2xl font-bold" style={{ color: 'var(--protein)' }}>{selectedMeal.protein}g</div>
                                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Protein</div>
                            </div>
                            <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                <div className="text-2xl font-bold" style={{ color: 'var(--carbs)' }}>{selectedMeal.carbs}g</div>
                                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Carbs</div>
                            </div>
                            <div className="text-center p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                <div className="text-2xl font-bold" style={{ color: 'var(--fat)' }}>{selectedMeal.fat}g</div>
                                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Fat</div>
                            </div>
                        </div>

                        {/* Ingredients */}
                        <div className="mb-6">
                            <h3 className="font-semibold mb-3">📝 Ingredients</h3>
                            <ul className="space-y-2">
                                {selectedMeal.ingredients.map((ingredient, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm">
                                        <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-primary)' }} />
                                        {ingredient}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Instructions */}
                        <div>
                            <h3 className="font-semibold mb-3">👨‍🍳 Instructions</h3>
                            <ol className="space-y-3">
                                {selectedMeal.instructions.map((step, i) => (
                                    <li key={i} className="flex gap-3 text-sm">
                                        <span
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                            style={{ background: 'var(--accent-primary)', color: 'white' }}
                                        >
                                            {i + 1}
                                        </span>
                                        <span style={{ color: 'var(--text-secondary)' }}>{step}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
