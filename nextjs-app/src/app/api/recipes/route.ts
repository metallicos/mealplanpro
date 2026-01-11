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

        // Filter out recipes without title or ingredients (in either target lang or EN)
        // We need to check this AFTER the joins, but we can't do that easily in WHERE clause before JOINs are defined in the query...
        // Wait, standard SQL allows filtering on joined tables in the WHERE clause even if the FROM is below? 
        // No, the query structure here builds the WHERE string separately.
        // But the main query uses `FROM recipes r LEFT JOIN ...`.
        // So we can reference `rt.title` etc in the WHERE clause if we put the WHERE clause after the JOINs.
        // The code constructs `whereClause` variable but puts it *before* the JOINs in the `countResult` query...
        // Ah, `countResult` query (line 49) does NOT have the JOINs currently! 
        // This is a bug in the existing count logic too if we filter by properties that might depend on translation (like title search).
        // BUT, for now, let's fix the main query filtering first.
        // Actually, to filter by "has title", we MUST join.
        // So I need to update the COUNT query to also join, OR at least the main query.
        // For efficiency, maybe just filter in the main query for now.
        // User asked to "fix the meal page to show only meals having titles and ingredients".
        // So I will add this condition to the main query's WHERE clause variables, but distinct for count vs list?
        // References to `rt` or `rt_en` will fail in the COUNT query if it doesn't join.
        // I should stick to `recipes` table checks if possible? No, title is in translations.
        // So I MUST add JOINs to the count query if I want effective total count of *valid* recipes.

        // Let's modify the construction to separate base filters from translation filters?
        // Or just add the JOINs to the count query too.


        // Filter out recipes without title or ingredients (in either target lang or EN)
        // We ensure that we have at least a title in one of the languages
        conditions.push('(COALESCE(NULLIF(rt.title, ""), NULLIF(rt_en.title, "")) IS NOT NULL)');
        conditions.push('(COALESCE(NULLIF(rt.ingredients_json, ""), NULLIF(rt_en.ingredients_json, ""), "[]") != "[]")');

        const whereClause = conditions.length > 0
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        // Get total count
        const lang = searchParams.get('lang') || 'en';
        const countParams = [lang, ...params];

        const countResult = await query(
            `SELECT COUNT(DISTINCT r.id) as total 
             FROM recipes r 
             LEFT JOIN recipe_translations rt ON r.id = rt.recipe_id AND rt.language_code = ?
             LEFT JOIN recipe_translations rt_en ON r.id = rt_en.recipe_id AND rt_en.language_code = 'en'
             ${whereClause}`,
            countParams
        );
        const total = (countResult as { total: number }[])[0]?.total || 0;

        const recipes = await query(
            `SELECT r.*, 
                    COALESCE(NULLIF(rt.title, ''), NULLIF(rt_en.title, ''), 'Untitled Recipe') as title,
                    COALESCE(NULLIF(rt.description, ''), NULLIF(rt_en.description, ''), '') as description,
                    COALESCE(NULLIF(rt.ingredients_json, ''), NULLIF(rt_en.ingredients_json, ''), '[]') as ingredients,
                    COALESCE(NULLIF(rt.method_json, ''), NULLIF(rt_en.method_json, ''), '[]') as method,
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
