import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
    const session = await getSession();

    if (!session) {
        return NextResponse.json({ user: null });
    }

    try {
        // Fetch fresh user data including household name if needed
        const result = await query<any[]>(
            `SELECT u.id, u.email, u.full_name, u.role, u.household_id, h.name as household_name
             FROM users u
             LEFT JOIN households h ON u.household_id = h.id
             WHERE u.id = ?`,
            [session.id]
        );

        if (result.length === 0) {
            return NextResponse.json({ user: null });
        }

        const user = result[0];

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                householdId: user.household_id,
                householdName: user.household_name
            }
        });
    } catch (error) {
        console.error('Session check error:', error);
        return NextResponse.json({ user: null }, { status: 500 });
    }
}
