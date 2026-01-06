import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession, hashPassword } from '@/lib/auth';

// GET - List all households (Admin only)
export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const households = await query<any[]>(
            `SELECT h.id, h.name, h.created_at, 
                    u.email as master_email, u.full_name as master_name,
                    (SELECT COUNT(*) FROM users WHERE household_id = h.id) as member_count
             FROM households h
             JOIN users u ON h.master_user_id = u.id
             ORDER BY h.created_at DESC`
        );

        return NextResponse.json(households);
    } catch (error) {
        console.error('GET /api/admin/households error:', error);
        return NextResponse.json({ error: 'Failed to fetch households' }, { status: 500 });
    }
}

// POST - Create new Household & Master Account
export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { householdName, email, password, fullName } = await request.json();

        if (!householdName || !email || !password || !fullName) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        // Check if email exists
        const existing = await query<any[]>('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
        }

        const passwordHash = await hashPassword(password);

        // Transaction-like flow (manual)
        // 1. Create User (Master) without household_id first
        await query(
            `INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, 'master')`,
            [email, passwordHash, fullName]
        );

        // Get inserted User ID
        const userRes = await query<any[]>('SELECT id FROM users WHERE email = ?', [email]);
        const masterUserId = userRes[0].id;

        // 2. Create Household
        await query(
            `INSERT INTO households (master_user_id, name) VALUES (?, ?)`,
            [masterUserId, householdName]
        );

        // Get inserted Household ID
        const householdRes = await query<any[]>('SELECT id FROM households WHERE master_user_id = ?', [masterUserId]);
        const householdId = householdRes[0].id;

        // 3. Update User with Household ID
        await query('UPDATE users SET household_id = ? WHERE id = ?', [householdId, masterUserId]);

        // 4. Create initial Profile for Master
        await query(
            `INSERT INTO user_profiles (user_id, weight, height, age, gender, activity_level, goal)
             VALUES (?, 0, 0, 0, 'male', 'sedentary', 'maintain')`,
            [masterUserId]
        );

        return NextResponse.json({ success: true, householdId });

    } catch (error) {
        console.error('POST /api/admin/households error:', error);
        return NextResponse.json({ error: 'Failed to create household' }, { status: 500 });
    }
}
