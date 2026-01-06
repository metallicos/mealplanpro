import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession, hashPassword } from '@/lib/auth';

// GET - List family members for the current household
export async function GET() {
    try {
        const session = await getSession();
        if (!session || !session.householdId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const members = await query<any[]>(
            `SELECT id, email, full_name, role, created_at 
             FROM users 
             WHERE household_id = ? 
             ORDER BY role ASC, created_at ASC`, // Master first, then members
            [session.householdId]
        );

        return NextResponse.json(members);
    } catch (error) {
        console.error('GET /api/family error:', error);
        return NextResponse.json({ error: 'Failed to fetch family members' }, { status: 500 });
    }
}

// POST - Add a new family member (Master user only)
export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || !session.householdId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.role !== 'master') {
            return NextResponse.json({ error: 'Only master users can add family members' }, { status: 403 });
        }

        const { fullName, email, password } = await request.json();

        if (!fullName || !email || !password) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        // Check email uniqueness
        const existing = await query<any[]>('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
        }

        const passwordHash = await hashPassword(password);

        // Create User
        await query(
            `INSERT INTO users (email, password_hash, full_name, role, household_id) 
             VALUES (?, ?, ?, 'member', ?)`,
            [email, passwordHash, fullName, session.householdId]
        );

        const memberRes = await query<any[]>('SELECT id FROM users WHERE email = ?', [email]);
        const memberId = memberRes[0].id;

        // Create Default Profile
        await query(
            `INSERT INTO user_profiles (user_id, weight, height, age, gender, activity_level, goal)
             VALUES (?, 0, 0, 0, 'female', 'sedentary', 'maintain')`, // Default to female just to diff from master default, user can change
            [memberId]
        );

        return NextResponse.json({ success: true, memberId });

    } catch (error) {
        console.error('POST /api/family error:', error);
        return NextResponse.json({ error: 'Failed to add family member' }, { status: 500 });
    }
}
