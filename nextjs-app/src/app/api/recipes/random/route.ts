import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const count = parseInt(searchParams.get('count') || '6');
    const healthyOnly = searchParams.get('healthy') === 'true';

    try {
        // Get random recipes with translations (V2 schema)
        const countInt = parseInt(count.toString());

        let sql = `
            SELECT r.*, rt.title, rt.description, rt.ingredients_json, rt.method_json
            FROM recipes r
            LEFT JOIN recipe_translations rt ON r.id = rt.recipe_id AND rt.language_code = 'en'
        `;
        const params: any[] = [];

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
