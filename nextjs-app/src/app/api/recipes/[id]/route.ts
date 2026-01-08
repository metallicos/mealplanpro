
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const { id } = params;

    try {
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

        // Parse JSON fields
        const parsedRecipe = {
            ...recipe,
            ingredients: JSON.parse(recipe.ingredients as string || '[]'),
            method: JSON.parse(recipe.method as string || '[]'),
            tags: JSON.parse(recipe.tags as string || '[]'),
            isHealthy: recipe.is_healthy === 1,
        };

        return NextResponse.json(parsedRecipe);
    } catch (error) {
        console.error('Recipe fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch recipe' },
            { status: 500 }
        );
    }
}
