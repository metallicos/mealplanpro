import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Helper to get today's date string YYYY-MM-DD
const getTodayDate = () => new Date().toISOString().split('T')[0];

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const date = request.nextUrl.searchParams.get('date') || getTodayDate();

        const logs = await query(
            'SELECT * FROM water_logs WHERE user_id = ? AND date = ?',
            [session.id, date]
        );

        // Calculate total amount from logs (if we decide to store individual entries)
        // Or if we store just one row per day, just return that.
        // Schema v2 defined: id, user_id, date, amount_ml
        // Let's assume we insert a new row for every "sip" or drink to show history?
        // OR we can aggregate. Let's return individual logs AND the total.

        const entries = (logs as any[]) || [];

        const total = entries.reduce((sum, entry) => sum + (entry.amount_ml || 0), 0);

        return NextResponse.json({
            date,
            total_ml: total,
            goal_ml: 2500, // Default goal, maybe specific per user profile later
            entries: entries
        });

    } catch (error) {
        console.error('GET /api/v2/water error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { amount_ml, date } = await request.json();
        const logDate = date || getTodayDate();

        if (!amount_ml || amount_ml <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        // Insert new entry
        await query(
            'INSERT INTO water_logs (user_id, date, amount_ml) VALUES (?, ?, ?)',
            [session.id, logDate, amount_ml]
        );

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('POST /api/v2/water error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
