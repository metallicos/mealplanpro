'use client';

import { useState, useEffect, useCallback } from 'react';

interface Recipe {
    id: number;
    title: string;
    description: string;
    url: string;
    prep_time: string;
    cook_time: string;
    serves: string;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fibre: number;
    sugars: number;
    salt: number;
    saturates: number;
    ingredients: string[];
    method: string[];
    image_url: string;
    local_image_path: string;
    category: string;
    subcategory: string;
    isHealthy: boolean;
    tags: string[];
    avg_rating?: string;
    rating_count?: number;
}

interface Category {
    category: string;
    count: number;
}

interface Subcategory {
    subcategory: string;
    count: number;
}

interface Rating {
    id: number;
    user_name: string;
    rating: number;
    comment: string;
    created_at: string;
}

const RecipeImage = ({ src, alt }: { src: string | null; alt: string }) => {
    const [imgSrc, setImgSrc] = useState<string | null>(src);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setImgSrc(src);
        setHasError(false);
    }, [src]);

    if (!imgSrc || hasError) {
        return (
            <div
                className="meal-card-image"
                style={{
                    backgroundImage: 'url(/images/placeholder.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
                title={alt}
            />
        );
    }

    return (
        <div className="meal-card-image relative overflow-hidden">
            <img
                src={imgSrc}
                alt={alt}
                className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                onError={() => setHasError(true)}
            />
        </div>
    );
};

const ITEMS_PER_PAGE = 12;

export default function MealsPage() {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
    const [showHealthyOnly, setShowHealthyOnly] = useState(false);

    // Categories
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [stats, setStats] = useState({ total: 0, healthy: 0 });

    // Selected meal for modal
    const [selectedMeal, setSelectedMeal] = useState<Recipe | null>(null);
    // Ratings state
    const [ratings, setRatings] = useState<Rating[]>([]);
    const [userRating, setUserRating] = useState(0);
    const [userComment, setUserComment] = useState('');
    const [submittingRating, setSubmittingRating] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1); // Reset to first page on search
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch categories
    useEffect(() => {
        async function fetchCategories() {
            try {
                const res = await fetch(`/api/recipes/categories?category=${selectedCategory}`);
                const data = await res.json();
                setCategories(data.categories || []);
                setSubcategories(data.subcategories || []);
                setStats(data.stats || { total: 0, healthy: 0 });
            } catch (err) {
                console.error('Failed to fetch categories:', err);
            }
        }
        fetchCategories();
    }, [selectedCategory]);

    // Fetch recipes
    const fetchRecipes = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(ITEMS_PER_PAGE),
            });

            if (debouncedSearch) params.append('search', debouncedSearch);
            if (selectedCategory !== 'all') params.append('category', selectedCategory);
            if (selectedSubcategory !== 'all') params.append('subcategory', selectedSubcategory);
            if (showHealthyOnly) params.append('healthy', 'true');

            const res = await fetch(`/api/recipes?${params}`);
            const data = await res.json();

            if (data.error) {
                throw new Error(data.error);
            }

            setRecipes(data.recipes || []);
            setTotalPages(data.pagination?.totalPages || 1);
            setTotal(data.pagination?.total || 0);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load recipes');
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, selectedCategory, selectedSubcategory, showHealthyOnly]);

    useEffect(() => {
        fetchRecipes();
    }, [fetchRecipes]);

    // Reset subcategory when category changes
    useEffect(() => {
        setSelectedSubcategory('all');
        setPage(1);
    }, [selectedCategory]);

    // Reset page on filter changes
    useEffect(() => {
        setPage(1);
    }, [showHealthyOnly, selectedSubcategory]);

    // Fetch ratings when meal selected
    useEffect(() => {
        if (selectedMeal) {
            setRatings([]);
            setUserRating(0);
            setUserComment('');
            fetch(`/api/recipes/${selectedMeal.id}/ratings`)
                .then(res => res.json())
                .then(data => setRatings(data.ratings || []))
                .catch(err => console.error(err));
        }
    }, [selectedMeal]);

    const submitRating = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMeal || userRating === 0) return;

        setSubmittingRating(true);
        try {
            const res = await fetch(`/api/recipes/${selectedMeal.id}/ratings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating: userRating, comment: userComment })
            });

            if (res.ok) {
                // Refresh ratings
                const refreshRes = await fetch(`/api/recipes/${selectedMeal.id}/ratings`);
                const data = await refreshRes.json();
                setRatings(data.ratings || []);
                setUserRating(0);
                setUserComment('');
            } else {
                alert('Failed to save rating');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmittingRating(false);
        }
    };

    // Get image URL (prefer local, fallback to remote)
    const getImageUrl = (recipe: Recipe) => {
        if (recipe.image_url) {
            return recipe.image_url;
        }
        if (recipe.local_image_path) {
            return `/images/recipes/${recipe.local_image_path.replace('images/', '')}`;
        }
        return null;
    };

    return (
        <div className="animate-fade-in">
            <div className="mb-8">
                <h1 className="page-title">Meal Library 📚</h1>
                <p className="page-subtitle">
                    {stats.total.toLocaleString()} recipes •
                    <span className="text-green-400"> {stats.healthy.toLocaleString()} healthy</span>
                </p>
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

                {/* Filter Toggles */}
                <div className="flex flex-wrap items-center gap-4 mb-4">
                    {/* Healthy Only Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg bg-gray-800/50">
                        <input
                            type="checkbox"
                            checked={showHealthyOnly}
                            onChange={(e) => setShowHealthyOnly(e.target.checked)}
                            className="w-4 h-4 accent-green-500"
                        />
                        <span className="text-sm">🥗 Healthy only</span>
                    </label>
                </div>

                {/* Category Filters */}
                <div className="mb-3">
                    <p className="text-xs text-gray-400 mb-2">Category</p>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedCategory === 'all'
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                        >
                            🌐 All ({stats.total.toLocaleString()})
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat.category}
                                onClick={() => setSelectedCategory(cat.category)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedCategory === cat.category
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                            >
                                {cat.category === 'healthy' ? '🥗' :
                                    cat.category === 'cuisine' ? '🌍' :
                                        cat.category === 'cakes-baking' ? '🍰' :
                                            cat.category === 'ramadan' ? '🌙' :
                                                cat.category === 'international' ? '🌍' : '📂'} {cat.category} ({cat.count})
                            </button>
                        ))}
                    </div>
                </div>

                {/* Subcategory Filters */}
                {subcategories.length > 0 && (
                    <div>
                        <p className="text-xs text-gray-400 mb-2">Subcategory</p>
                        <div className="flex gap-2 flex-wrap max-h-24 overflow-y-auto">
                            <button
                                onClick={() => setSelectedSubcategory('all')}
                                className={`px-2 py-1 rounded text-xs transition-all ${selectedSubcategory === 'all'
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                            >
                                All
                            </button>
                            {subcategories.slice(0, 20).map((sub) => (
                                <button
                                    key={sub.subcategory}
                                    onClick={() => setSelectedSubcategory(sub.subcategory)}
                                    className={`px-2 py-1 rounded text-xs transition-all ${selectedSubcategory === sub.subcategory
                                        ? 'bg-violet-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    {sub.subcategory?.replace(/-/g, ' ')} ({sub.count})
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Results count */}
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {loading ? 'Loading...' : `Showing ${recipes.length} of ${total.toLocaleString()} meals`}
                </p>
                {totalPages > 1 && (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        Page {page} of {totalPages}
                    </p>
                )}
            </div>

            {/* Error State */}
            {error && (
                <div className="text-center py-12">
                    <p className="text-red-400">❌ {error}</p>
                    <button
                        onClick={() => fetchRecipes()}
                        className="mt-4 text-violet-400 hover:text-violet-300"
                    >
                        Try again
                    </button>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                    {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                        <div key={i} className="meal-card animate-pulse">
                            <div className="meal-card-image bg-gray-700" />
                            <div className="meal-card-content">
                                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
                                <div className="h-3 bg-gray-700 rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Meal Grid */}
            {!loading && !error && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                    {recipes.map((meal) => (
                        <div
                            key={meal.id}
                            className="meal-card cursor-pointer relative"
                            onClick={() => setSelectedMeal(meal)}
                        >
                            {/* Healthy Badge */}
                            {meal.isHealthy && (
                                <div className="absolute top-2 left-2 z-10 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg">
                                    🥗 Healthy
                                </div>
                            )}

                            {/* Image with Fallback */}
                            <RecipeImage
                                src={getImageUrl(meal)}
                                alt={meal.title}
                            />
                            <div className="meal-card-content relative bg-[var(--bg-primary)] p-4">
                                <h4 className="font-bold truncate mb-2 group-hover:text-[var(--accent-primary)] transition-colors">{meal.title}</h4>
                                <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                                    <div className="flex gap-2">
                                        <span>{meal.kcal} kcal</span>
                                        <span>{meal.protein}g P</span>
                                    </div>
                                    {meal.avg_rating && (
                                        <div className="flex items-center gap-1 text-yellow-500 font-bold">
                                            <span>★</span> {meal.avg_rating} <span className="text-gray-600 font-normal">({meal.rating_count})</span>
                                        </div>
                                    )}
                                </div>
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

                    ))}
                </div>

{/* No Results */}
            {
                !loading && !error && recipes.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-2xl mb-2">🍽️</p>
                        <p className="text-gray-400">No meals found matching your criteria.</p>
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedCategory('all');
                                setShowHealthyOnly(false);
                            }}
                            className="mt-4 text-violet-400 hover:text-violet-300"
                        >
                            Clear all filters
                        </button>
                    </div>
                )
            }

            {/* Pagination */}
            {
                totalPages > 1 && !loading && (
                    <div className="flex justify-center items-center gap-2 mt-6">
                        <button
                            onClick={() => setPage(1)}
                            disabled={page === 1}
                            className="px-3 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ««
                        </button>
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            «
                        </button>
                        <span className="px-4 py-2 text-sm">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-3 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            »
                        </button>
                        <button
                            onClick={() => setPage(totalPages)}
                            disabled={page === totalPages}
                            className="px-3 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            »»
                        </button>
                    </div>
                )
            }

            {/* Meal Detail Modal */}
            {
                selectedMeal && (
                    <div
                        className="fixed inset-0 bg-black/80 z-50 overflow-auto"
                        onClick={() => setSelectedMeal(null)}
                    >
                        <div
                            className="min-h-screen flex items-start justify-center p-4 pt-8"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-gray-900 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
                                {/* Header Image */}
                                <div className="relative h-64">
                                    {getImageUrl(selectedMeal) ? (
                                        <img
                                            src={getImageUrl(selectedMeal) || ''}
                                            alt={selectedMeal.title}
                                            className="absolute inset-0 w-full h-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.src = '/images/placeholder.png';
                                            }}
                                        />
                                    ) : (
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                            <span className="text-6xl">🍽️</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />

                                    {/* Badges */}
                                    <div className="absolute top-4 left-4 flex gap-2">
                                        {selectedMeal.isHealthy && (
                                            <span className="bg-green-500 text-white text-sm px-3 py-1 rounded-full font-medium">
                                                🥗 Healthy
                                            </span>
                                        )}
                                        <span className="bg-gray-800/80 text-white text-sm px-3 py-1 rounded-full capitalize">
                                            {selectedMeal.category?.replace(/-/g, ' ')}
                                        </span>
                                    </div>

                                    {/* Close button */}
                                    <button
                                        onClick={() => setSelectedMeal(null)}
                                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                                    >
                                        ✕
                                    </button>

                                    {/* Title */}
                                    <div className="absolute bottom-4 left-4 right-4">
                                        <h2 className="text-2xl font-bold text-white">{selectedMeal.title}</h2>
                                        <p className="text-gray-300 text-sm mt-1 line-clamp-2">{selectedMeal.description}</p>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    {/* Quick Info */}
                                    <div className="flex gap-4 mb-6 text-sm">
                                        <span className="flex items-center gap-1">⏱️ {selectedMeal.prep_time || 'N/A'}</span>
                                        <span className="flex items-center gap-1">👥 {selectedMeal.serves || '?'} servings</span>
                                    </div>

                                    {/* Nutritional Info */}
                                    <div className="grid grid-cols-4 gap-4 mb-6 p-4 rounded-xl bg-gray-800/50">
                                        <div className="text-center">
                                            <div className="text-xl font-bold" style={{ color: 'var(--calories)' }}>{selectedMeal.kcal}</div>
                                            <div className="text-xs text-gray-400">kcal</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xl font-bold" style={{ color: 'var(--protein)' }}>{selectedMeal.protein}g</div>
                                            <div className="text-xs text-gray-400">Protein</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xl font-bold" style={{ color: 'var(--carbs)' }}>{selectedMeal.carbs}g</div>
                                            <div className="text-xs text-gray-400">Carbs</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xl font-bold" style={{ color: 'var(--fat)' }}>{selectedMeal.fat}g</div>
                                            <div className="text-xs text-gray-400">Fat</div>
                                        </div>
                                    </div>

                                    {/* Additional Nutritional Info */}
                                    {(selectedMeal.fibre > 0 || selectedMeal.sugars > 0 || selectedMeal.salt > 0) && (
                                        <div className="grid grid-cols-3 gap-4 mb-6 p-3 rounded-lg bg-gray-800/30 text-sm">
                                            <div className="text-center">
                                                <div className="font-medium">{selectedMeal.fibre}g</div>
                                                <div className="text-xs text-gray-500">Fibre</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-medium">{selectedMeal.sugars}g</div>
                                                <div className="text-xs text-gray-500">Sugars</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-medium">{selectedMeal.salt}g</div>
                                                <div className="text-xs text-gray-500">Salt</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Ingredients */}
                                    <div className="mb-6">
                                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                            🥕 Ingredients
                                        </h3>
                                        <ul className="space-y-2">
                                            {selectedMeal.ingredients?.map((ing, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                                    <span className="text-violet-400 mt-1">•</span>
                                                    {ing}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Method/Instructions */}
                                    <div className="mb-6">
                                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                            👨‍🍳 Method
                                        </h3>
                                        <ol className="space-y-3">
                                            {selectedMeal.method?.map((step, i) => (
                                                <li key={i} className="flex gap-3 text-sm text-gray-300">
                                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center">
                                                        {i + 1}
                                                    </span>
                                                    <span>{step}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>

                                    {/* Divider */}
                                    <hr className="border-gray-800 my-6" />

                                    {/* Ratings & Reviews */}
                                    <div className="mb-6">
                                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                            ⭐ Reviews ({ratings.length})
                                        </h3>

                                        {/* Rating Form */}
                                        <form onSubmit={submitRating} className="mb-6 bg-gray-800/30 p-4 rounded-xl">
                                            <p className="text-sm font-medium mb-2">Rate this meal</p>
                                            <div className="flex gap-2 mb-3">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        type="button"
                                                        key={star}
                                                        onClick={() => setUserRating(star)}
                                                        className="text-2xl hover:scale-110 transition-transform"
                                                    >
                                                        {star <= userRating ? '⭐' : '☆'}
                                                    </button>
                                                ))}
                                            </div>
                                            <textarea
                                                className="form-input w-full text-sm mb-2"
                                                rows={2}
                                                placeholder="Write a comment..."
                                                value={userComment}
                                                onChange={e => setUserComment(e.target.value)}
                                            />
                                            <button
                                                type="submit"
                                                disabled={userRating === 0 || submittingRating}
                                                className="btn-primary text-xs w-full disabled:opacity-50"
                                            >
                                                {submittingRating ? 'Posting...' : 'Post Review'}
                                            </button>
                                        </form>

                                        {/* Reviews List */}
                                        <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                                            {ratings.map(review => (
                                                <div key={review.id} className="border-b border-gray-800 pb-3 last:border-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="font-semibold text-sm text-violet-400">{review.user_name}</span>
                                                        <span className="text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="flex text-yellow-500 text-xs mb-1">
                                                        {'⭐'.repeat(review.rating)}
                                                    </div>
                                                    {review.comment && (
                                                        <p className="text-sm text-gray-300">{review.comment}</p>
                                                    )}
                                                </div>
                                            ))}
                                            {ratings.length === 0 && (
                                                <p className="text-sm text-gray-500 text-center py-2">No reviews yet. Be the first!</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Source Link */}
                                    {selectedMeal.url && false && (
                                        <div />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
