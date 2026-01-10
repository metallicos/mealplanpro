import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession, hashPassword } from '@/lib/auth';

// GET - Fetch user profile
export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        let targetUserId = session.id;
        const requestedUserId = searchParams.get('user_id');

        if (requestedUserId) {
            targetUserId = parseInt(requestedUserId);
        }

        // Fetch User details (Name, Email) + Profile
        const results = await query(
            `SELECT u.full_name, u.email, up.* 
             FROM users u
             LEFT JOIN user_profiles up ON u.id = up.user_id
             WHERE u.id = ?`,
            [targetUserId]
        );

        if ((results as any[]).length === 0) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        const data = (results as any[])[0];

        return NextResponse.json({
            // User info
            full_name: data.full_name,
            email: data.email,

            // Profile info (handle nulls if no profile record yet)
            weight: data.weight ? Number(data.weight) : 0,
            height: data.height || 0,
            age: data.age || 0,
            gender: data.gender || 'male',
            activityLevel: data.activity_level || 'sedentary',
            goal: data.goal || 'maintain',
            dailyCalorieTarget: data.daily_calorie_target || 2000,
            proteinTarget: data.protein_target || 150,
            carbsTarget: data.carbs_target || 200,
            fatTarget: data.fat_target || 66,
            dietMode: data.diet_mode || 'normal',
            neck: data.neck || 0,
            waist: data.waist || 0,
            hip: data.hip || 0,
            avatar_url: data.avatar_url,
        });
    } catch (error) {
        console.error('GET /api/profile error:', error);
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }
}

// POST - Save/update user profile & user info
export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            user_id,
            full_name,
            email,
            password,
            avatar_url,
            ...settings
        } = body;

        // Allow updating specific user if provided and authorized, or default to self
        const targetUserId = user_id ? parseInt(user_id) : session.id;

        // Security check: Only allow editing self for now (unless Admin, logic omitted for brevity)
        if (targetUserId !== session.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // 1. Update User Table (Name, Email, Password)
        const userUpdates = [];
        const userParams = [];

        if (full_name) {
            userUpdates.push('full_name = ?');
            userParams.push(full_name);
        }

        if (email) {
            // Check uniqueness
            const existing = await query('SELECT id FROM users WHERE email = ? AND id != ?', [email, targetUserId]);
            if ((existing as any[]).length > 0) {
                return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
            }
            userUpdates.push('email = ?');
            userParams.push(email);
        }

        if (password) {
            const hashed = await hashPassword(password);
            userUpdates.push('password_hash = ?');
            userParams.push(hashed);
        }

        if (userUpdates.length > 0) {
            userParams.push(targetUserId);
            await query(
                `UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`,
                userParams
            );
        }

        // 2. Update/Insert Profile Table (Settings + Avatar)
        // SQLite ON CONFLICT syntax
        await query(
            `INSERT INTO user_profiles 
             (user_id, weight, height, age, gender, activity_level, goal, 
              daily_calorie_target, protein_target, carbs_target, fat_target, diet_mode, neck, waist, hip, avatar_url, facebook, instagram, twitter)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET 
              weight = excluded.weight,
              height = excluded.height,
              age = excluded.age,
              gender = excluded.gender,
              activity_level = excluded.activity_level,
              goal = excluded.goal,
              daily_calorie_target = excluded.daily_calorie_target,
              protein_target = excluded.protein_target,
              carbs_target = excluded.carbs_target,
              fat_target = excluded.fat_target,
              diet_mode = excluded.diet_mode,
              neck = excluded.neck,
              waist = excluded.waist,
              hip = excluded.hip,
              avatar_url = excluded.avatar_url,
              facebook = excluded.facebook,
              instagram = excluded.instagram,
              twitter = excluded.twitter`,
            [
                targetUserId,
                settings.weight || null,
                settings.height || null,
                settings.age || null,
                settings.gender || null, // Ensure gender is passed if updated
                settings.activityLevel || null,
                settings.goal || null,
                settings.dailyCalorieTarget || null,
                settings.proteinTarget || null,
                settings.carbsTarget || null,
                settings.fatTarget || null,
                settings.dietMode || 'normal',
                settings.neck || 0,
                settings.waist || 0,
                settings.hip || 0,
                avatar_url || null,
                settings.facebook || null,
                settings.instagram || null,
                settings.twitter || null
            ]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('POST /api/profile error:', error);
        return NextResponse.json({
            error: 'Failed to save profile',
            details: error.message || String(error)
        }, { status: 500 });
    }
}
