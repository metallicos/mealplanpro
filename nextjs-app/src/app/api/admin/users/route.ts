import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
    try {
        // Verify admin
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;
        const payload = token ? await verifyToken(token) : null;

        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const users = await query(`
            SELECT 
                id, email, full_name, role, 
                newsletter_subscribed, terms_accepted_at, created_at
            FROM users
            ORDER BY created_at DESC
        `);

        return NextResponse.json(users);
    } catch (error) {
        console.error('Admin users error:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;
        const payload = token ? await verifyToken(token) : null;

        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { email, full_name, password, role } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }

        // Check if email exists
        const existing = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
        if ((existing as any[]).length > 0) {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await query(`
            INSERT INTO users (email, password_hash, full_name, role, terms_accepted_at)
            VALUES (?, ?, ?, ?, datetime('now'))
            RETURNING id
        `, [email.toLowerCase(), hashedPassword, full_name || '', role || 'user']);

        return NextResponse.json({ success: true, id: (result as any[])[0]?.id });
    } catch (error) {
        console.error('Create user error:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
