import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET: Fetch ratings for a meal
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const ratings = await query(`
            SELECT r.*, u.full_name as user_name
            FROM meal_ratings r
            JOIN users u ON r.user_id = u.id
            WHERE r.meal_id = ?
            ORDER BY r.created_at DESC
        `, [id]);

        return NextResponse.json({ ratings });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 });
    }
}

// POST: Add a rating/comment
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await getSession();
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        const { rating, comment } = await request.json();

        if (!rating || rating < 1 || rating > 5) {
            return NextResponse.json({ error: 'Invalid rating (1-5)' }, { status: 400 });
        }

        // Check if user already rated (optional: allow updates)
        const existing = await query(`SELECT id FROM meal_ratings WHERE user_id = ? AND meal_id = ?`, [auth.id, id]);

        if ((existing as any[]).length > 0) {
            // Update existing
            await query(`
                UPDATE meal_ratings 
                SET rating = ?, comment = ?, created_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [rating, comment || null, (existing as any[])[0].id]);
        } else {
            // Insert new
            await query(`
                INSERT INTO meal_ratings (user_id, meal_id, rating, comment)
                VALUES (?, ?, ?, ?)
            `, [auth.id, id, rating, comment || null]);
        }

        return NextResponse.json({ message: 'Rating saved' });
    } catch (error) {
        console.error('Rating error:', error);
        return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 });
    }
}
