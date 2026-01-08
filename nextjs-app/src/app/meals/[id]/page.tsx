'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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

export default function MealDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!id) return;

        fetch(`/api/recipes/${id}`)
            .then(res => {
                if (!res.ok) throw new Error('Recipe not found');
                return res.json();
            })
            .then(data => {
                // Ensure ingredients/method are arrays (legacy data might be strings if not parsed correctly)
                // The API parses them, but just in case
                setRecipe(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError('Recipe not found or failed to load.');
                setLoading(false);
            });
    }, [id]);

    const getImageUrl = (recipe: Recipe) => {
        if (recipe.local_image_path) {
            return `/images/recipes/${recipe.local_image_path.replace('images/', '')}`;
        }
        return recipe.image_url || '/images/placeholder.png';
    };

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
                    style={{ backgroundImage: `url(${getImageUrl(recipe)})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[var(--bg-primary)]" />
            </div>

            <div className="relative z-10 pt-[25vh] px-4 max-w-4xl mx-auto">
                <Link href="/meals" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 bg-black/30 backdrop-blur-md px-4 py-2 rounded-full transition-all hover:bg-black/50">
                    ← Back to Meals
                </Link>

                <div className="card shadow-2xl border-t border-white/10 relative overflow-hidden">
                    {/* Decorative Top Border */}
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-400 to-red-500"></div>

                    <div className="mb-6">
                        <div className="flex flex-wrap gap-2 mb-3">
                            {recipe.isHealthy && (
                                <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                                    🥗 Healthy Choice
                                </span>
                            )}
                            <span className="bg-white/10 text-gray-300 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                                📂 {recipe.category?.replace(/-/g, ' ')}
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">{recipe.title}</h1>
                        <p className="text-lg text-gray-400 leading-relaxed">{recipe.description}</p>
                    </div>

                    {/* Meta Data Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 py-6 border-y border-white/5">
                        <div className="text-center">
                            <div className="text-2xl mb-1">⏱️</div>
                            <div className="font-bold">{recipe.prep_time}</div>
                            <div className="text-xs text-gray-500">Prep Time</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl mb-1">🔥</div>
                            <div className="font-bold">{recipe.cook_time}</div>
                            <div className="text-xs text-gray-500">Cook Time</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl mb-1">👥</div>
                            <div className="font-bold">{recipe.serves}</div>
                            <div className="text-xs text-gray-500">Servings</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl mb-1">⚡</div>
                            <div className="font-bold text-[var(--calories)]">{recipe.kcal}</div>
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
                                <div className="text-xl font-bold text-[var(--protein)]">{recipe.protein}g</div>
                                <div className="text-xs text-gray-400">Protein</div>
                            </div>
                            <div className="bg-[var(--bg-secondary)] p-3 rounded-lg text-center">
                                <div className="text-xl font-bold text-[var(--carbs)]">{recipe.carbs}g</div>
                                <div className="text-xs text-gray-400">Carbs</div>
                            </div>
                            <div className="bg-[var(--bg-secondary)] p-3 rounded-lg text-center">
                                <div className="text-xl font-bold text-[var(--fat)]">{recipe.fat}g</div>
                                <div className="text-xs text-gray-400">Fat</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Ingredients */}
                        <div>
                            <h3 className="font-bold text-xl mb-4 border-b border-white/10 pb-2">🛒 Ingredients</h3>
                            <ul className="space-y-3">
                                {Array.isArray(recipe.ingredients) && recipe.ingredients.map((ing, i) => (
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
                                {Array.isArray(recipe.method) && recipe.method.map((step, i) => (
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
            </div>
        </div>
    );
}
