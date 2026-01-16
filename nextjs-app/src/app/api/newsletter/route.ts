import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { newsletterSubscribedEmail } from '@/lib/email-templates';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { subscribed } = await request.json();

        // Update DB
        await query(
            'UPDATE users SET newsletter_subscribed = ? WHERE id = ?',
            [subscribed ? 1 : 0, session.id]
        );

        // Send Email if subscribing
        if (subscribed) {
            // Fetch username/email to personalize
            const userRes = await query<any[]>('SELECT username, email FROM users WHERE id = ?', [session.id]);
            const user = userRes[0];
            if (user) {
                try {
                    await sendEmail(
                        user.email,
                        'Newsletter Subscription Confirmed',
                        newsletterSubscribedEmail(user.username || 'User')
                    );
                } catch (e) {
                    console.error('Email send failed:', e);
                }
            }
        }

        return NextResponse.json({ success: true, subscribed });
    } catch (error) {
        console.error('Newsletter update error:', error);
        return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
    }
}
