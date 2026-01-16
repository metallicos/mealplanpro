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
            `SELECT u.full_name, u.email, u.newsletter_subscribed, up.* 
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
            newsletterSubscribed: data.newsletter_subscribed === 1,

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
            themePreference: data.theme_preference || 'auto',
            currency: data.currency || 'USD',
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

        console.log('[API] Profile POST received:', { user_id, currency: settings.currency, full_body: body });

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
              daily_calorie_target, protein_target, carbs_target, fat_target, diet_mode, neck, waist, hip, avatar_url, facebook, instagram, twitter, theme_preference, currency, preferred_currency)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET 
              weight = COALESCE(excluded.weight, user_profiles.weight),
              height = COALESCE(excluded.height, user_profiles.height),
              age = COALESCE(excluded.age, user_profiles.age),
              gender = COALESCE(excluded.gender, user_profiles.gender),
              activity_level = COALESCE(excluded.activity_level, user_profiles.activity_level),
              goal = COALESCE(excluded.goal, user_profiles.goal),
              daily_calorie_target = COALESCE(excluded.daily_calorie_target, user_profiles.daily_calorie_target),
              protein_target = COALESCE(excluded.protein_target, user_profiles.protein_target),
              carbs_target = COALESCE(excluded.carbs_target, user_profiles.carbs_target),
              fat_target = COALESCE(excluded.fat_target, user_profiles.fat_target),
              diet_mode = COALESCE(excluded.diet_mode, user_profiles.diet_mode),
              neck = COALESCE(excluded.neck, user_profiles.neck),
              waist = COALESCE(excluded.waist, user_profiles.waist),
              hip = COALESCE(excluded.hip, user_profiles.hip),
              avatar_url = COALESCE(excluded.avatar_url, user_profiles.avatar_url),
              facebook = COALESCE(excluded.facebook, user_profiles.facebook),
              instagram = COALESCE(excluded.instagram, user_profiles.instagram),
              twitter = COALESCE(excluded.twitter, user_profiles.twitter),
              theme_preference = COALESCE(excluded.theme_preference, user_profiles.theme_preference),
              currency = COALESCE(excluded.currency, user_profiles.currency),
              preferred_currency = COALESCE(excluded.preferred_currency, user_profiles.preferred_currency)`,
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
                settings.dietMode || null, // Allow NULL to preserve existing
                settings.neck || null,
                settings.waist || null,
                settings.hip || null,
                avatar_url || null,
                settings.facebook || null,
                settings.instagram || null,
                settings.twitter || null,
                settings.themePreference || null,
                settings.currency || null,
                settings.currency || null // Sync preferred_currency
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

import { clearSession } from '@/lib/auth';

// DELETE - Delete user account
export async function DELETE(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const requestedUserId = searchParams.get('user_id');
        const targetUserId = requestedUserId ? parseInt(requestedUserId) : session.id;

        // Security check: Only allow deleting self (unless Admin)
        if (targetUserId !== session.id) {
            // In a real app we'd check admin role here
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // 1. Break Cyclic Dependency: Handle Household
        // If user is a master, delete the household first. 
        // This triggers CASCADE on budgets/items and SET NULL on member's household_id.
        const households = await query<any[]>('SELECT id FROM households WHERE master_user_id = ?', [targetUserId]);
        if (households.length > 0) {
            await query('DELETE FROM households WHERE master_user_id = ?', [targetUserId]);
        }

        // 2. Also manually nullify household_id for the user just in case (though step 1 should do it if they were master)
        // If they were just a member, this isn't strictly needed for deletion, but good for cleanup if constraint is weird.
        await query('UPDATE users SET household_id = NULL WHERE id = ?', [targetUserId]);

        // 3. Delete Profile
        await query('DELETE FROM user_profiles WHERE user_id = ?', [targetUserId]);

        // 4. Delete User
        await query('DELETE FROM users WHERE id = ?', [targetUserId]);

        // 5. Clear Session (Logout)
        await clearSession();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/profile error:', error);
        return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }
}
