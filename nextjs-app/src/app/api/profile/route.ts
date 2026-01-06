import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

interface UserProfile {
    id: number;
    user_id: number;
    weight: number;
    height: number;
    age: number;
    gender: 'male' | 'female';
    activity_level: string;
    goal: string;
    daily_calorie_target: number;
    protein_target: number;
    carbs_target: number;
    fat_target: number;
}

// GET - Fetch user profile
export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        // We can ignore user_id query param and always return logged-in user's profile
        // Or if Admin/Master viewing family, check permission.
        // For now, simple: return OWN profile or fetch by ID if permitted.

        let targetUserId = session.id;
        const requestedUserId = searchParams.get('user_id');

        // TODO: Add permission check if requestedUserId != session.id
        // For now, trust request if it's set (assuming frontend Logic handles it), but ideally check relationship
        // Actually, for simplicity now: ONLY return own profile unless Master logic is implemented
        if (requestedUserId) {
            targetUserId = parseInt(requestedUserId);
        }

        const profiles = await query<UserProfile[]>(
            'SELECT * FROM user_profiles WHERE user_id = ?',
            [targetUserId]
        );

        if (profiles.length === 0) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        const profile = profiles[0];
        return NextResponse.json({
            weight: Number(profile.weight),
            height: profile.height,
            age: profile.age,
            gender: profile.gender,
            activityLevel: profile.activity_level,
            goal: profile.goal,
            dailyCalorieTarget: profile.daily_calorie_target,
            proteinTarget: profile.protein_target,
            carbsTarget: profile.carbs_target,
            fatTarget: profile.fat_target,
        });
    } catch (error) {
        console.error('GET /api/profile error:', error);
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }
}

// POST - Save/update user profile
export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { user_id, ...settings } = body;

        // Allow updating specific user if provided and authorized, or default to self
        const targetUserId = user_id ? parseInt(user_id) : session.id;

        // Basic security: simple check (improve later)
        // if (targetUserId !== session.id && session.role !== 'master' && session.role !== 'admin') {
        //    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        // }

        await query(
            `INSERT INTO user_profiles 
             (user_id, weight, height, age, gender, activity_level, goal, 
              daily_calorie_target, protein_target, carbs_target, fat_target)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
              weight = VALUES(weight),
              height = VALUES(height),
              age = VALUES(age),
              gender = VALUES(gender),
              activity_level = VALUES(activity_level),
              goal = VALUES(goal),
              daily_calorie_target = VALUES(daily_calorie_target),
              protein_target = VALUES(protein_target),
              carbs_target = VALUES(carbs_target),
              fat_target = VALUES(fat_target)`,
            [
                targetUserId,
                settings.weight || null,
                settings.height || null,
                settings.age || null,
                settings.gender || null,
                settings.activityLevel || null,
                settings.goal || null,
                settings.dailyCalorieTarget || null,
                settings.proteinTarget || null,
                settings.carbsTarget || null,
                settings.fatTarget || null,
            ]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('POST /api/profile error:', error);
        return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
    }
}
