import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET all recipes for admin (simplified view)
export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;
        const payload = token ? await verifyToken(token) : null;

        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const recipes = await query(`
            SELECT r.*, 
                   COALESCE(rt_en.title, rt.title, 'Untitled') as title,
                   COALESCE(rt_en.description, rt.description, '') as description
            FROM recipes r
            LEFT JOIN recipe_translations rt_en ON r.id = rt_en.recipe_id AND rt_en.language_code = 'en'
            LEFT JOIN recipe_translations rt ON r.id = rt.recipe_id
            GROUP BY r.id
            ORDER BY r.created_at DESC
        `);

        return NextResponse.json(recipes);
    } catch (error) {
        console.error('Admin meals error:', error);
        return NextResponse.json({ error: 'Failed to fetch meals' }, { status: 500 });
    }
}

// POST create new recipe
export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;
        const payload = token ? await verifyToken(token) : null;

        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {
            title, description, category, subcategory,
            calories, protein, carbs, fat,
            prep_time, cook_time, servings,
            ingredients, method, image_url, is_healthy
        } = await request.json();

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        // Insert recipe
        const result = await query(`
            INSERT INTO recipes (
                category, subcategory, calories, protein, carbs, fat,
                prep_time, cook_time, servings, image_url, is_healthy, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            RETURNING id
        `, [
            category || 'other',
            subcategory || '',
            calories || 0,
            protein || 0,
            carbs || 0,
            fat || 0,
            prep_time || 0,
            cook_time || 0,
            servings || 1,
            image_url || '',
            is_healthy ? 1 : 0
        ]);

        const recipeId = (result as any[])[0]?.id;

        // Insert English translation
        await query(`
            INSERT INTO recipe_translations (recipe_id, language_code, title, description, ingredients_json, method_json)
            VALUES (?, 'en', ?, ?, ?, ?)
        `, [
            recipeId,
            title,
            description || '',
            JSON.stringify(ingredients || []),
            JSON.stringify(method || [])
        ]);

        return NextResponse.json({ success: true, id: recipeId });
    } catch (error) {
        console.error('Create meal error:', error);
        return NextResponse.json({ error: 'Failed to create meal' }, { status: 500 });
    }
}
