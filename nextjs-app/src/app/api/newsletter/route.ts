import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { subscribed } = await request.json();

        await query(
            'UPDATE users SET newsletter_subscribed = ? WHERE id = ?',
            [subscribed ? 1 : 0, session.id]
        );

        return NextResponse.json({ success: true, subscribed });
    } catch (error) {
        console.error('Newsletter update error:', error);
        return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
    }
}
