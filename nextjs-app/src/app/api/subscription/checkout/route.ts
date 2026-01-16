import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { getGateway, getEnabledGateways } from '@/lib/payment';

/**
 * POST /api/subscription/checkout
 * Create a checkout session for the selected payment provider
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { provider, locale } = await request.json();

        if (!provider) {
            return NextResponse.json({ error: 'Payment provider is required' }, { status: 400 });
        }

        // Verify the provider is enabled
        const enabledGateways = await getEnabledGateways(locale);
        if (!enabledGateways.includes(provider)) {
            return NextResponse.json({ error: 'Payment provider is not available' }, { status: 400 });
        }

        // Get user email
        const users = await query<{ email: string }[]>(
            'SELECT email FROM users WHERE id = ?',
            [session.id]
        );

        if (!users[0]) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const email = users[0].email;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Get the payment gateway and create checkout
        const gateway = await getGateway(provider);
        const checkout = await gateway.createCheckout(
            session.id,
            email,
            `${appUrl}/subscription/success`,
            `${appUrl}/subscription/cancel`
        );

        return NextResponse.json({
            url: checkout.url,
            sessionId: checkout.sessionId,
        });

    } catch (error) {
        console.error('POST /api/subscription/checkout error:', error);
        return NextResponse.json({
            error: 'Failed to create checkout session',
            details: (error as Error).message
        }, { status: 500 });
    }
}
