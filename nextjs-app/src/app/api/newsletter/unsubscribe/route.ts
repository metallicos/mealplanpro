import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await query(
            'UPDATE users SET newsletter_subscribed = 0 WHERE id = ?',
            [session.id]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Newsletter unsubscribe error:', error);
        return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
    }
}
