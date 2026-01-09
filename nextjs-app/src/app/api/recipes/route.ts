import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = (page - 1) * limit;

    // Filters
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const subcategory = searchParams.get('subcategory') || '';
    const healthyOnly = searchParams.get('healthy') === 'true';

    try {
        // Build WHERE clause
        const conditions: string[] = [];
        const params: (string | number)[] = [];

        if (search) {
            conditions.push('(title LIKE ? OR description LIKE ? OR ingredients LIKE ?)');
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        if (category && category !== 'all') {
            conditions.push('category = ?');
            params.push(category);
        }

        if (subcategory && subcategory !== 'all') {
            conditions.push('subcategory = ?');
            params.push(subcategory);
        }

        if (healthyOnly) {
            conditions.push('is_healthy = 1');
        }

        const whereClause = conditions.length > 0
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) as total FROM recipes ${whereClause}`,
            params
        );
        const total = (countResult as { total: number }[])[0]?.total || 0;

        // Get recipes with pagination and ratings
        // Create temp view or just join?
        // SQLite: Join recipe_translations 
        // We need to fallback. 
        // Strategy: Join translations ON recipe_id AND language_code = ? 
        // But if null, we need 'en'.
        // Easier: Select * from recipes and LEFT JOIN translations. 
        // In the map step, if translation title is null, we might need a fallback query or just use the base fields if we kept them. 
        // Wait, schema_v2 moved string fields to translations. The base `recipes` table only has metadata.
        // So we MUST join.

        // Let's assume current params include 'lang'.
        const lang = searchParams.get('lang') || 'en';

        const recipes = await query(
            `SELECT r.*, 
                    COALESCE(rt.title, rt_en.title) as title,
                    COALESCE(rt.description, rt_en.description) as description,
                    COALESCE(rt.ingredients_json, rt_en.ingredients_json) as ingredients,
                    COALESCE(rt.method_json, rt_en.method_json) as method,
                    AVG(mr.rating) as avg_rating,
                    COUNT(mr.rating) as rating_count
             FROM recipes r
             LEFT JOIN recipe_translations rt ON r.id = rt.recipe_id AND rt.language_code = ?
             LEFT JOIN recipe_translations rt_en ON r.id = rt_en.recipe_id AND rt_en.language_code = 'en'
             LEFT JOIN meal_ratings mr ON r.id = mr.meal_id
             ${whereClause} 
             GROUP BY r.id
             ORDER BY title ASC 
             LIMIT ? OFFSET ?`,
            [lang, ...params, limit, offset]
        );

        // Parse JSON fields
        const parsedRecipes = (recipes as Record<string, unknown>[]).map(recipe => ({
            ...recipe,
            kcal: recipe.calories, // Map calories to kcal for frontend compatibility
            ingredients: typeof recipe.ingredients === 'string' ? JSON.parse(recipe.ingredients) : (recipe.ingredients || []),
            method: typeof recipe.method === 'string' ? JSON.parse(recipe.method) : (recipe.method || []),
            tags: recipe.tags ? (typeof recipe.tags === 'string' ? JSON.parse(recipe.tags) : recipe.tags) : [],
            isHealthy: recipe.is_healthy === 1,
            avg_rating: recipe.avg_rating ? Number(recipe.avg_rating).toFixed(1) : null,
            rating_count: recipe.rating_count || 0
        }));

        return NextResponse.json({
            recipes: parsedRecipes,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Recipes API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch recipes' },
            { status: 500 }
        );
    }
}

// Get single recipe by ID
export async function POST(request: NextRequest) {
    try {
        const { id } = await request.json();

        const recipes = await query(
            'SELECT * FROM recipes WHERE id = ?',
            [id]
        );

        if (!recipes || (recipes as unknown[]).length === 0) {
            return NextResponse.json(
                { error: 'Recipe not found' },
                { status: 404 }
            );
        }

        const recipe = (recipes as Record<string, unknown>[])[0];

        return NextResponse.json({
            ...recipe,
            ingredients: JSON.parse(recipe.ingredients as string || '[]'),
            method: JSON.parse(recipe.method as string || '[]'),
            tags: JSON.parse(recipe.tags as string || '[]'),
            isHealthy: recipe.is_healthy === 1,
        });
    } catch (error) {
        console.error('Recipe fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch recipe' },
            { status: 500 }
        );
    }
}
