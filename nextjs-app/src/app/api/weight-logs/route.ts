import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface WeightLog {
    id: number;
    user_id: string;
    week_date: string;
    weight: number;
    notes: string | null;
    created_at: string;
}

// GET - Fetch weight logs for a user
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');
        const limit = parseInt(searchParams.get('limit') || '52'); // Default last year

        if (!userId) {
            return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
        }

        const logs = await query<WeightLog[]>(
            `SELECT * FROM weight_logs 
             WHERE user_id = ? 
             ORDER BY week_date DESC 
             LIMIT ?`,
            [userId, limit]
        );

        return NextResponse.json(logs.map(log => ({
            id: log.id,
            weekDate: log.week_date,
            weight: Number(log.weight),
            notes: log.notes,
            createdAt: log.created_at,
        })));
    } catch (error) {
        console.error('GET /api/weight-logs error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: 'Failed to fetch weight logs', details: errorMessage }, { status: 500 });
    }
}

// POST - Add/update weight log
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { user_id, week_date, weight, notes } = body;

        if (!user_id || !week_date || !weight) {
            return NextResponse.json({ error: 'user_id, week_date, and weight are required' }, { status: 400 });
        }

        await query(
            `INSERT INTO weight_logs (user_id, week_date, weight, notes)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
              weight = VALUES(weight),
              notes = VALUES(notes)`,
            [user_id, week_date, weight, notes || null]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('POST /api/weight-logs error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: 'Failed to save weight log', details: errorMessage }, { status: 500 });
    }
}

// DELETE - Remove weight log
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');
        const weekDate = searchParams.get('week_date');

        if (!userId || !weekDate) {
            return NextResponse.json({ error: 'user_id and week_date are required' }, { status: 400 });
        }

        await query(
            'DELETE FROM weight_logs WHERE user_id = ? AND week_date = ?',
            [userId, weekDate]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/weight-logs error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: 'Failed to delete weight log', details: errorMessage }, { status: 500 });
    }
}
