'use client';

import { useState, useEffect, useMemo } from 'react';
import { mealPlans, getMealsByCuisine } from '@/lib/meal-plans';
import type { MealPlan } from '@/lib/types';

const ITEMS_PER_PAGE = 12;

interface GroceryItem {
    id: number;
    name: string;
}

export default function MealsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCuisine, setSelectedCuisine] = useState<string>('all');
    const [selectedMeal, setSelectedMeal] = useState<MealPlan | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [filterByGroceries, setFilterByGroceries] = useState(false);
    const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
    const [loadingGroceries, setLoadingGroceries] = useState(false);

    const cuisines = useMemo(() => ['all', ...Object.keys(getMealsByCuisine())], []);

    // Fetch grocery items when filter is enabled
    useEffect(() => {
        if (filterByGroceries && groceryItems.length === 0) {
            setLoadingGroceries(true);
            fetch('/api/groceries')
                .then(res => res.json())
                .then(data => {
                    // Extract all item names from all budgets
                    const items: GroceryItem[] = [];
                    data.budgets?.forEach((budget: { items: GroceryItem[] }) => {
                        budget.items?.forEach((item: GroceryItem) => {
                            if (!items.find(i => i.name.toLowerCase() === item.name.toLowerCase())) {
                                items.push(item);
                            }
                        });
                    });
                    setGroceryItems(items);
                })
                .catch(console.error)
                .finally(() => setLoadingGroceries(false));
        }
    }, [filterByGroceries, groceryItems.length]);

    // Filter meals
    const filteredMeals = useMemo(() => {
        return mealPlans.filter(meal => {
            // Search filter
            const query = searchQuery.toLowerCase().trim();
            const matchesSearch = !query ||
                meal.name.toLowerCase().includes(query) ||
                meal.description.toLowerCase().includes(query) ||
                meal.ingredients.some(ing => ing.toLowerCase().includes(query));

            // Cuisine filter
            const matchesCuisine = selectedCuisine === 'all' || meal.cuisine === selectedCuisine;

            // Grocery filter - check if meal has at least one ingredient from grocery list
            let matchesGroceries = true;
            if (filterByGroceries && groceryItems.length > 0) {
                const groceryNames = groceryItems.map(g => g.name.toLowerCase());
                matchesGroceries = meal.ingredients.some(ing =>
                    groceryNames.some(gName => ing.toLowerCase().includes(gName) || gName.includes(ing.toLowerCase()))
                );
            }

            return matchesSearch && matchesCuisine && matchesGroceries;
        });
    }, [searchQuery, selectedCuisine, filterByGroceries, groceryItems]);

    // Pagination
    const totalPages = Math.ceil(filteredMeals.length / ITEMS_PER_PAGE);
    const paginatedMeals = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredMeals.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredMeals, currentPage]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedCuisine, filterByGroceries]);

    return (
        <div className="animate-fade-in">
            <div className="mb-8">
                <h1 className="page-title">Meal Library 📚</h1>
                <p className="page-subtitle">{mealPlans.length} international meal ideas with full nutritional info and recipes.</p>
            </div>

            {/* Search and Filter */}
            <div className="card mb-6">
                {/* Search Bar */}
                <div className="relative mb-4">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    <input
                        type="text"
                        placeholder="Search meals by name, description, or ingredient..."
                        className="form-input w-full pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Grocery Filter Toggle */}
                <div className="flex items-center gap-3 mb-4 p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filterByGroceries}
                            onChange={(e) => setFilterByGroceries(e.target.checked)}
                            className="w-4 h-4 accent-violet-500"
                        />
                        <span className="text-sm">🛒 Show only meals with my grocery items</span>
                    </label>
                    {loadingGroceries && <span className="text-xs text-gray-400">Loading groceries...</span>}
                    {filterByGroceries && groceryItems.length > 0 && (
                        <span className="text-xs text-gray-400">({groceryItems.length} items in list)</span>
                    )}
                </div>

                {/* Cuisine Filters */}
                <div className="flex gap-2 flex-wrap">
                    {cuisines.map((cuisine) => (
                        <button
                            key={cuisine}
                            onClick={() => setSelectedCuisine(cuisine)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedCuisine === cuisine
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                        >
                            {cuisine === 'all' ? 'All' : cuisine}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results count */}
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Showing {paginatedMeals.length} of {filteredMeals.length} meals
                </p>
                {totalPages > 1 && (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        Page {currentPage} of {totalPages}
                    </p>
                )}
            </div>

            {/* Meal Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                {paginatedMeals.map((meal) => (
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

            {/* No Results */}
            {filteredMeals.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-2xl mb-2">🍽️</p>
                    <p className="text-gray-400">No meals found matching your criteria.</p>
                    <button
                        onClick={() => { setSearchQuery(''); setSelectedCuisine('all'); setFilterByGroceries(false); }}
                        className="mt-4 text-violet-400 hover:text-violet-300"
                    >
                        Clear all filters
                    </button>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                    <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ««
                    </button>
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        «
                    </button>

                    {/* Page Numbers */}
                    <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (currentPage <= 3) {
                                pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = currentPage - 2 + i;
                            }
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`w-10 h-10 rounded-lg font-medium transition-all ${currentPage === pageNum
                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        »
                    </button>
                    <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        »»
                    </button>
                </div>
            )}

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
