import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const profiles = await query<any[]>(
            'SELECT * FROM user_profiles WHERE user_id = ?',
            [session.id]
        );

        if (profiles.length === 0) {
            return NextResponse.json({ found: false }, { status: 404 });
        }

        const profile = profiles[0];

        // Parse JSON fields
        try {
            profile.macros_goal = JSON.parse(profile.macros_goal || '{}');
            profile.dietary_restrictions = JSON.parse(profile.dietary_restrictions || '[]');
        } catch (e) {
            console.warn('Failed to parse profile JSON', e);
        }

        return NextResponse.json({ found: true, profile });
    } catch (error) {
        console.error('Error fetching profile:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const {
            gender,
            activity_level,
            dietary_restrictions,
            goals, // We'll compute macros from this or store it
            preferred_language,
            preferred_currency
        } = body;

        // Simple macro calculation logic (can be refined later)
        let macros = {
            calories: 2000,
            protein: 150,
            carbs: 200,
            fat: 65
        };

        if (goals === 'lose_weight') {
            macros.calories = 1800;
            macros.carbs = 150;
        } else if (goals === 'build_muscle') {
            macros.calories = 2500;
            macros.protein = 180;
        }

        // Upsert profile - include goals and onboarding_completed field
        await query(
            `INSERT INTO user_profiles (
                user_id, gender, activity_level, dietary_restrictions, macros_goal, 
                preferred_language, preferred_currency, goals, onboarding_completed
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            ON CONFLICT(user_id) DO UPDATE SET
                gender = excluded.gender,
                activity_level = excluded.activity_level,
                dietary_restrictions = excluded.dietary_restrictions,
                macros_goal = excluded.macros_goal,
                preferred_language = excluded.preferred_language,
                preferred_currency = excluded.preferred_currency,
                goals = excluded.goals,
                onboarding_completed = 1`,
            [
                session.id,
                gender,
                activity_level,
                JSON.stringify(dietary_restrictions || []),
                JSON.stringify(macros),
                preferred_language || 'en',
                preferred_currency || 'USD',
                goals || 'maintain'
            ]
        );

        // Actually, SQL above had "updated_at = CURRENT_TIMESTAMP" which might fail if column doesn't exist.
        // I will correct the SQL in the tool call below to remove updated_at.

        return NextResponse.json({ success: true, macros });
    } catch (error) {
        console.error('Error saving profile:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
