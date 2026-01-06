import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { comparePassword, signToken, setSession } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const users = await query<any[]>(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const user = users[0];
        const isValid = await comparePassword(password, user.password_hash);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Create session
        const token = await signToken({
            id: user.id,
            email: user.email,
            role: user.role,
            householdId: user.household_id,
        });

        await setSession(token);

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                householdId: user.household_id
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
