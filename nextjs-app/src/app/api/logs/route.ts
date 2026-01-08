import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET: Fetch logs for a specific date
export async function GET(request: NextRequest) {
    const auth = await getSession();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
        return NextResponse.json({ error: 'Date required' }, { status: 400 });
    }

    try {
        const logs = await query(`
            SELECT * FROM daily_logs 
            WHERE user_id = ? AND date = ?
            ORDER BY created_at ASC
        `, [auth.id, date]);

        // Parse minerals JSON if needed
        const parsedLogs = (logs as any[]).map(log => ({
            ...log,
            minerals: log.minerals ? JSON.parse(log.minerals) : null
        }));

        return NextResponse.json({ logs: parsedLogs });
    } catch (error) {
        console.error('Fetch logs error:', error);
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }
}

// POST: Add a new log entry
export async function POST(request: NextRequest) {
    const auth = await getSession();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { date, food_name, grams, calories, protein, carbs, fat, meal_type, minerals } = body;

        if (!date || !food_name || !grams) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const result = await query(`
            INSERT INTO daily_logs (user_id, date, food_name, grams, calories, protein, carbs, fat, meal_type, minerals)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
        `, [
            auth.id,
            date,
            food_name,
            grams,
            calories,
            protein,
            carbs,
            fat,
            meal_type,
            minerals ? JSON.stringify(minerals) : null
        ]);

        return NextResponse.json({ success: true, id: (result as any[])[0]?.id });

    } catch (error) {
        console.error('Add log error:', error);
        return NextResponse.json({ error: 'Failed to add log' }, { status: 500 });
    }
}

// PUT: Update a log entry
export async function PUT(request: NextRequest) {
    const auth = await getSession();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { id, grams, calories, protein, carbs, fat, meal_type, minerals } = body;

        if (!id || !grams) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify ownership
        const existing = await query('SELECT user_id FROM daily_logs WHERE id = ?', [id]);
        if ((existing as any[]).length === 0) {
            return NextResponse.json({ error: 'Log not found' }, { status: 404 });
        }

        if ((existing as any[])[0].user_id !== auth.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await query(`
            UPDATE daily_logs 
            SET grams = ?, calories = ?, protein = ?, carbs = ?, fat = ?, meal_type = ?, minerals = ?
            WHERE id = ?
        `, [
            grams,
            calories,
            protein,
            carbs,
            fat,
            meal_type,
            minerals ? JSON.stringify(minerals) : null,
            id
        ]);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Update log error:', error);
        return NextResponse.json({ error: 'Failed to update log' }, { status: 500 });
    }
}

// DELETE: Remove a log entry
export async function DELETE(request: NextRequest) {
    const auth = await getSession();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        // Verify ownership
        const existing = await query('SELECT user_id FROM daily_logs WHERE id = ?', [id]);
        if ((existing as any[]).length === 0) {
            return NextResponse.json({ error: 'Log not found' }, { status: 404 });
        }

        if ((existing as any[])[0].user_id !== auth.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await query('DELETE FROM daily_logs WHERE id = ?', [id]);
        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete log' }, { status: 500 });
    }
}
