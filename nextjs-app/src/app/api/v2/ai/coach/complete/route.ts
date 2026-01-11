import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { date, workout, rating, notes } = body;

        if (!date || !workout) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const feedback = JSON.stringify({ rating, notes });
        const workoutJson = JSON.stringify(workout);

        await query(
            'INSERT INTO completed_workouts (user_id, date, workout_json, feedback_json, notes) VALUES (?, ?, ?, ?, ?)',
            [session.id, date, workoutJson, feedback, notes]
        );

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Save Workout Error:', error);
        return NextResponse.json({ error: 'Failed to save workout' }, { status: 500 });
    }
}
