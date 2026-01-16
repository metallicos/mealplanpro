import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET single recipe
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;
        const payload = token ? await verifyToken(token) : null;

        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const recipes = await query(`
            SELECT r.*, 
                   rt.title, rt.description, rt.ingredients_json, rt.method_json
            FROM recipes r
            LEFT JOIN recipe_translations rt ON r.id = rt.recipe_id AND rt.language_code = 'en'
            WHERE r.id = ?
        `, [id]);

        if (!(recipes as any[]).length) {
            return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
        }

        const recipe = (recipes as any[])[0];
        return NextResponse.json({
            ...recipe,
            ingredients: recipe.ingredients_json ? JSON.parse(recipe.ingredients_json) : [],
            method: recipe.method_json ? JSON.parse(recipe.method_json) : []
        });
    } catch (error) {
        console.error('Get meal error:', error);
        return NextResponse.json({ error: 'Failed to fetch meal' }, { status: 500 });
    }
}

// PUT update recipe
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;
        const payload = token ? await verifyToken(token) : null;

        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const {
            title, description, category, subcategory,
            calories, protein, carbs, fat,
            prep_time, cook_time, servings,
            ingredients, method, image_url, is_healthy
        } = await request.json();

        // Update recipe base
        await query(`
            UPDATE recipes SET
                category = ?, subcategory = ?, calories = ?, protein = ?, carbs = ?, fat = ?,
                prep_time = ?, cook_time = ?, servings = ?, image_url = ?, is_healthy = ?
            WHERE id = ?
        `, [
            category, subcategory, calories, protein, carbs, fat,
            prep_time, cook_time, servings, image_url, is_healthy ? 1 : 0, id
        ]);

        // Update or insert translation
        const existingTranslation = await query(
            'SELECT id FROM recipe_translations WHERE recipe_id = ? AND language_code = ?',
            [id, 'en']
        );

        if ((existingTranslation as any[]).length > 0) {
            await query(`
                UPDATE recipe_translations SET
                    title = ?, description = ?, ingredients_json = ?, method_json = ?
                WHERE recipe_id = ? AND language_code = 'en'
            `, [title, description, JSON.stringify(ingredients), JSON.stringify(method), id]);
        } else {
            await query(`
                INSERT INTO recipe_translations (recipe_id, language_code, title, description, ingredients_json, method_json)
                VALUES (?, 'en', ?, ?, ?, ?)
            `, [id, title, description, JSON.stringify(ingredients), JSON.stringify(method)]);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update meal error:', error);
        return NextResponse.json({ error: 'Failed to update meal' }, { status: 500 });
    }
}

// DELETE recipe
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;
        const payload = token ? await verifyToken(token) : null;

        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Delete translations first (foreign key)
        await query('DELETE FROM recipe_translations WHERE recipe_id = ?', [id]);
        // Delete recipe
        await query('DELETE FROM recipes WHERE id = ?', [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete meal error:', error);
        return NextResponse.json({ error: 'Failed to delete meal' }, { status: 500 });
    }
}
