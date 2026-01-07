import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword, signToken, setSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const { email, password, full_name, family_name, gender } = await request.json();

        if (!email || !password || !full_name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Check if email exists
        const existingUsers = await query('SELECT id FROM users WHERE email = ?', [email]);
        if ((existingUsers as any[]).length > 0) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 409 }); // 409 Conflict
        }

        // 2. Hash password
        const hashedPassword = await hashPassword(password);

        // 3. Create User (initially without household_id)
        // Note: SQLite CREATE INSERT returning ID via separate query if needed, 
        // but libraries often handle returning. 
        // My 'query' wrapper returns the result. If using simplified wrapper, I might need to fetch last_insert_rowid via `RETURNING id` if supported or separate query.
        // SQLite supports RETURNING since 3.35. Assuming libSql supports it.
        const userResult = await query(`
            INSERT INTO users (email, password_hash, full_name, role) 
            VALUES (?, ?, ?, 'master')
            RETURNING id
        `, [email, hashedPassword, full_name]);

        const userId = (userResult as any[])[0]?.id;

        if (!userId) {
            throw new Error("Failed to create user");
        }

        // 4. Create Household
        const householdName = family_name || `${full_name.split(' ')[0]}'s Family`;
        const householdResult = await query(`
            INSERT INTO households (master_user_id, name)
            VALUES (?, ?)
            RETURNING id
        `, [userId, householdName]);

        const householdId = (householdResult as any[])[0]?.id;

        // 5. Update User with Household ID
        await query('UPDATE users SET household_id = ? WHERE id = ?', [householdId, userId]);

        // 6. Create Initial Profile
        await query(`
            INSERT INTO user_profiles (user_id, gender) VALUES (?, ?)
        `, [userId, gender || 'male']);

        // 7. Auto Login
        const token = await signToken({
            id: userId,
            email,
            role: 'master',
            householdId
        });

        await setSession(token);

        return NextResponse.json({ success: true, user: { id: userId, email, full_name, role: 'master', householdId } });

    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }
}
