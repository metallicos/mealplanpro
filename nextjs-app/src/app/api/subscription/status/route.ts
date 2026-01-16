import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSubscriptionStatus } from '@/lib/subscription';
import { getEnabledGateways, getPremiumPrice } from '@/lib/payment/settings';

/**
 * GET /api/subscription/status
 * Get current user's subscription status
 */
export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const status = await getSubscriptionStatus(session.id);
        const availableGateways = await getEnabledGateways();
        const priceUSD = await getPremiumPrice('USD');
        const priceMAD = await getPremiumPrice('MAD');

        return NextResponse.json({
            ...status,
            pricing: {
                usd: priceUSD,
                mad: priceMAD,
            },
            availableGateways,
        });

    } catch (error) {
        console.error('GET /api/subscription/status error:', error);
        return NextResponse.json({ error: 'Failed to get subscription status' }, { status: 500 });
    }
}
