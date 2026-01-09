'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/contexts/UserContext';

interface Recipe {
    id: number;
    title: string;
    description: string;
    prep_time: string;
    cook_time: string;
    serves: string;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    ingredients: string[];
    method: string[];
    image_url: string;
    local_image_path: string;
    category: string;
    isHealthy: boolean;
}

interface Rating {
    id: number;
    user_name: string;
    rating: number;
    comment: string;
    created_at: string;
}

export default function MealDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useUser();

    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Ratings State
    const [ratings, setRatings] = useState<Rating[]>([]);
    const [userRating, setUserRating] = useState(0);
    const [userComment, setUserComment] = useState('');
    const [submittingRating, setSubmittingRating] = useState(false);

    useEffect(() => {
        if (!id) return;

        // Fetch Recipe
        fetch(`/api/recipes/${id}`)
            .then(res => {
                if (!res.ok) throw new Error('Recipe not found');
                return res.json();
            })
            .then(data => {
                setRecipe(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError('Recipe not found or failed to load.');
                setLoading(false);
            });

        // Fetch Ratings
        fetch(`/api/recipes/${id}/ratings`)
            .then(res => res.json())
            .then(data => setRatings(data.ratings || []))
            .catch(err => console.error(err));
    }, [id]);

    const handleRate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return alert('Please login to rate');
        setSubmittingRating(true);

        try {
            const res = await fetch(`/api/recipes/${id}/ratings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating: userRating, comment: userComment })
            });

            if (res.ok) {
                // Refresh ratings
                const rRes = await fetch(`/api/recipes/${id}/ratings`);
                const rData = await rRes.json();
                setRatings(rData.ratings || []);
                setUserComment('');
                setUserRating(0);
                alert('Thanks for your review!');
            } else {
                alert('Failed to submit review');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmittingRating(false);
        }
    };

    const getImageUrl = (recipe: Recipe) => {
        if (recipe.image_url) {
            return recipe.image_url;
        }
        if (recipe.local_image_path) {
            return `/images/recipes/${recipe.local_image_path.replace('images/', '')}`;
        }
        return '/images/placeholder.png';
    };

    const averageRating = ratings.length > 0
        ? (ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length).toFixed(1)
        : 'New';

    if (loading) return <div className="text-center py-12">Loading meal details...</div>;
    if (error || !recipe) return (
        <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">😕 {error}</h2>
            <Link href="/meals" className="btn-primary">Browse All Meals</Link>
        </div>
    );

    return (
        <div className="min-h-screen pb-20 animate-fade-in relative">
            {/* Header Image Background */}
            <div className="absolute top-0 left-0 right-0 h-[40vh] z-0">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${getImageUrl(recipe!)})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[var(--bg-primary)]" />
            </div>

            <div className="relative z-10 pt-[25vh] px-4 max-w-4xl mx-auto">
                <Link href="/meals" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 bg-black/30 backdrop-blur-md px-4 py-2 rounded-full transition-all hover:bg-black/50">
                    ← Back to Meals
                </Link>

                <div className="card shadow-2xl border-t border-white/10 relative overflow-hidden mb-8">
                    {/* Decorative Top Border */}
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-400 to-red-500"></div>

                    <div className="mb-6">
                        <div className="flex flex-wrap gap-2 mb-3">
                            {recipe!.isHealthy && (
                                <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                                    🥗 Healthy Choice
                                </span>
                            )}
                            <span className="bg-white/10 text-gray-300 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                                📂 {recipe!.category?.replace(/-/g, ' ')}
                            </span>
                            <span className="bg-yellow-500/20 text-yellow-500 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1">
                                ⭐ {averageRating} ({ratings.length})
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">{recipe!.title}</h1>
                        <p className="text-lg text-gray-400 leading-relaxed">{recipe!.description}</p>
                    </div>

                    {/* Meta Data Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 py-6 border-y border-white/5">
                        <div className="text-center">
                            <div className="text-2xl mb-1">⏱️</div>
                            <div className="font-bold">{recipe!.prep_time?.replace(/Prep:\s*/i, '').replace(/mins?/, 'm')}</div>
                            <div className="text-xs text-gray-500">Prep Time</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl mb-1">🔥</div>
                            <div className="font-bold">{recipe!.cook_time?.replace(/Cook:\s*/i, '').replace(/mins?/, 'm')}</div>
                            <div className="text-xs text-gray-500">Cook Time</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl mb-1">👥</div>
                            <div className="font-bold">{recipe!.serves}</div>
                            <div className="text-xs text-gray-500">Servings</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl mb-1">⚡</div>
                            <div className="font-bold text-[var(--calories)]">{recipe!.kcal}</div>
                            <div className="text-xs text-gray-500">Calories</div>
                        </div>
                    </div>

                    {/* Macros */}
                    <div className="mb-8">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <span>📊</span> Nutrition per serving
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-[var(--bg-secondary)] p-3 rounded-lg text-center">
                                <div className="text-xl font-bold text-[var(--protein)]">{recipe!.protein}g</div>
                                <div className="text-xs text-gray-400">Protein</div>
                            </div>
                            <div className="bg-[var(--bg-secondary)] p-3 rounded-lg text-center">
                                <div className="text-xl font-bold text-[var(--carbs)]">{recipe!.carbs}g</div>
                                <div className="text-xs text-gray-400">Carbs</div>
                            </div>
                            <div className="bg-[var(--bg-secondary)] p-3 rounded-lg text-center">
                                <div className="text-xl font-bold text-[var(--fat)]">{recipe!.fat}g</div>
                                <div className="text-xs text-gray-400">Fat</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Ingredients */}
                        <div>
                            <h3 className="font-bold text-xl mb-4 border-b border-white/10 pb-2">🛒 Ingredients</h3>
                            <ul className="space-y-3">
                                {Array.isArray(recipe!.ingredients) && recipe!.ingredients.map((ing, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm md:text-base text-gray-300">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] flex-shrink-0" />
                                        <span>{ing}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Method */}
                        <div>
                            <h3 className="font-bold text-xl mb-4 border-b border-white/10 pb-2">👨‍🍳 Instructions</h3>
                            <div className="space-y-6">
                                {Array.isArray(recipe!.method) && recipe!.method.map((step, i) => (
                                    <div key={i} className="relative pl-6">
                                        <div className="absolute left-0 top-0 text-xl font-bold text-white/10 select-none">
                                            {i + 1}
                                        </div>
                                        <p className="text-gray-300 text-sm md:text-base leading-relaxed">{step}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ratings & Comments Section */}
                <div className="card shadow-2xl border-t border-white/10">
                    <h3 className="font-bold text-2xl mb-6 flex items-center gap-2">
                        ⭐ Reviews <span className="text-base font-normal text-gray-500">({ratings.length})</span>
                    </h3>

                    {/* Review Form */}
                    {user && (
                        <form onSubmit={handleRate} className="bg-[var(--bg-secondary)]/50 p-6 rounded-2xl mb-8 border border-white/5">
                            <h4 className="font-bold mb-4">Leave a Review</h4>
                            <div className="flex gap-2 mb-4">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setUserRating(star)}
                                        className={`text-2xl transition-transform hover:scale-110 ${star <= userRating ? 'text-yellow-400' : 'text-gray-600'}`}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                            <textarea
                                className="form-input w-full mb-4 bg-black/20"
                                placeholder="What did you think of this recipe?"
                                value={userComment}
                                onChange={e => setUserComment(e.target.value)}
                                rows={3}
                            />
                            <button
                                type="submit"
                                disabled={submittingRating || userRating === 0}
                                className="btn-primary disabled:opacity-50"
                            >
                                {submittingRating ? 'Submitting...' : 'Submit Review'}
                            </button>
                        </form>
                    )}

                    {/* Reviews List */}
                    <div className="space-y-6">
                        {ratings.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No reviews yet. Be the first to try it! 🍽️</p>
                        ) : (
                            ratings.map(review => (
                                <div key={review.id} className="border-b border-white/5 last:border-0 pb-6 last:pb-0">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-bold">{review.user_name}</div>
                                        <div className="text-yellow-400 text-sm">{'★'.repeat(review.rating)}<span className="text-gray-700">{'★'.repeat(5 - review.rating)}</span></div>
                                    </div>
                                    <div className="text-xs text-gray-500 mb-2">{new Date(review.created_at).toLocaleDateString()}</div>
                                    <p className="text-gray-300 text-sm leading-relaxed">
                                        {review.comment || <span className="italic text-gray-600">No comment provided</span>}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
