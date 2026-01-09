import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get the latest active fast or the most recent completed one
        const logs = await query(
            'SELECT * FROM fasting_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
            [session.id]
        );

        const lastLog = (logs as any[])[0];

        return NextResponse.json({
            activeFast: lastLog && !lastLog.end_time ? lastLog : null,
            lastFast: lastLog && lastLog.end_time ? lastLog : null,
        });

    } catch (error) {
        console.error('GET /api/v2/fasting error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, goal_hours } = await request.json();

        if (action === 'START') {
            // Check if already fasting
            const activeCheck = await query(
                'SELECT id FROM fasting_logs WHERE user_id = ? AND end_time IS NULL',
                [session.id]
            );
            if ((activeCheck as any[]).length > 0) {
                return NextResponse.json({ error: 'Already fasting' }, { status: 409 });
            }

            const startTime = new Date().toISOString();
            await query(
                'INSERT INTO fasting_logs (user_id, start_time, goal_hours) VALUES (?, ?, ?)',
                [session.id, startTime, goal_hours || 16]
            );
            return NextResponse.json({ success: true, start_time: startTime });
        }

        if (action === 'STOP') {
            // Find active fast
            const activeCheck = await query(
                'SELECT id FROM fasting_logs WHERE user_id = ? AND end_time IS NULL',
                [session.id]
            );
            const activeId = (activeCheck as any[])[0]?.id;

            if (!activeId) {
                return NextResponse.json({ error: 'No active fast' }, { status: 404 });
            }

            const endTime = new Date().toISOString();
            await query(
                'UPDATE fasting_logs SET end_time = ? WHERE id = ?',
                [endTime, activeId]
            );
            return NextResponse.json({ success: true, end_time: endTime });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('POST /api/v2/fasting error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
