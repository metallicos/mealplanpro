import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const count = parseInt(searchParams.get('count') || '6');
    const healthyOnly = searchParams.get('healthy') === 'true';
    const lang = searchParams.get('lang') || 'en';

    try {
        // Get random recipes with translations (Requested Lang -> Fallback EN -> 'Untitled')
        const countInt = parseInt(count.toString());

        let sql = `
            SELECT r.*, 
                   COALESCE(rt.title, rt_en.title, 'Untitled Recipe') as title,
                   COALESCE(rt.description, rt_en.description, '') as description,
                   COALESCE(rt.ingredients_json, rt_en.ingredients_json, '[]') as ingredients_json,
                   COALESCE(rt.method_json, rt_en.method_json, '[]') as method_json
            FROM recipes r
            LEFT JOIN recipe_translations rt ON r.id = rt.recipe_id AND rt.language_code = ?
            LEFT JOIN recipe_translations rt_en ON r.id = rt_en.recipe_id AND rt_en.language_code = 'en'
        `;

        const params: any[] = [lang];

        if (healthyOnly) {
            sql += ' WHERE is_healthy = 1';
        }

        sql += ' ORDER BY RANDOM() LIMIT ?';
        params.push(countInt);

        const recipes = await query(sql, params);

        // Parse JSON fields and map to expected format
        const parsedRecipes = (recipes as Record<string, unknown>[]).map(recipe => ({
            ...recipe,
            kcal: recipe.calories, // Map calories to kcal for frontend
            ingredients: recipe.ingredients_json ? JSON.parse(recipe.ingredients_json as string) : [],
            method: recipe.method_json ? JSON.parse(recipe.method_json as string) : [],
            isHealthy: recipe.is_healthy === 1,
        }));

        return NextResponse.json({ recipes: parsedRecipes });
    } catch (error) {
        console.error('Random recipes API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch random recipes', recipes: [] },
            { status: 500 }
        );
    }
}
