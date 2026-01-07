import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const count = parseInt(searchParams.get('count') || '6');
    const healthyOnly = searchParams.get('healthy') === 'true';

    try {
        // Get random recipes using SQLite's RANDOM() function
        // Note: SQLite uses 1/0 for boolean
        const countInt = parseInt(count.toString()); // Ensure int

        let sql = 'SELECT * FROM recipes';
        const params: any[] = [];

        if (healthyOnly) {
            sql += ' WHERE is_healthy = 1';
        }

        sql += ' ORDER BY RANDOM() LIMIT ?';
        params.push(countInt);

        const recipes = await query(sql, params);

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
