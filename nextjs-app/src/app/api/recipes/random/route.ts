import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const count = parseInt(searchParams.get('count') || '6');
    const healthyOnly = searchParams.get('healthy') === 'true';

    try {
        // Get random recipes using SQLite's RANDOM() function
        const whereClause = healthyOnly ? 'WHERE is_healthy = 1' : '';

        const recipes = await query(`
            SELECT * FROM recipes 
            ${whereClause}
            ORDER BY RANDOM() 
            LIMIT ?
        `, [count]);

        // Parse JSON fields
        const parsedRecipes = (recipes as Record<string, unknown>[]).map(recipe => ({
            ...recipe,
            ingredients: JSON.parse(recipe.ingredients as string || '[]'),
            method: JSON.parse(recipe.method as string || '[]'),
            tags: JSON.parse(recipe.tags as string || '[]'),
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
