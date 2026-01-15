import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {
            date,
            sleep_hours,
            mood_score,
            energy_level,
            notes,
            sport_type,
            training_location,
            equipment
        } = await request.json();

        const checkinDate = date || new Date().toISOString().split('T')[0];
        const equipmentJson = equipment ? JSON.stringify(equipment) : '[]';

        // SQLite Upsert
        await query(
            `INSERT INTO daily_checkins (user_id, date, sleep_hours, mood_score, energy_level, notes, sport_type, training_location, equipment)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(user_id, date) DO UPDATE SET
                sleep_hours = excluded.sleep_hours,
                mood_score = excluded.mood_score,
                energy_level = excluded.energy_level,
                notes = excluded.notes,
                sport_type = excluded.sport_type,
                training_location = excluded.training_location,
                equipment = excluded.equipment,
                created_at = CURRENT_TIMESTAMP`,
            [session.id, checkinDate, sleep_hours, mood_score, energy_level, notes, sport_type, training_location, equipmentJson]
        );

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('POST /api/v2/checkin error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const date = request.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0];

        const res = await query(
            'SELECT * FROM daily_checkins WHERE user_id = ? AND date = ?',
            [session.id, date]
        );

        return NextResponse.json((res as any[])[0] || null);

    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
