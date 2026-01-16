import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { cancelSubscription, getSubscription } from '@/lib/subscription';
import { getGateway } from '@/lib/payment';

/**
 * POST /api/subscription/cancel
 * Cancel the user's subscription
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { immediate } = await request.json();

        // Get current subscription
        const subscription = await getSubscription(session.id);
        if (!subscription) {
            return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
        }

        // If there's a payment provider subscription, cancel it there too
        if (subscription.payment_provider && subscription.provider_subscription_id) {
            try {
                const gateway = await getGateway(subscription.payment_provider);
                await gateway.cancelSubscription(subscription.provider_subscription_id);
            } catch (providerError) {
                console.error('Failed to cancel with provider:', providerError);
                // Continue with local cancellation even if provider cancellation fails
            }
        }

        // Cancel in our database
        await cancelSubscription(session.id, !immediate);

        return NextResponse.json({
            success: true,
            message: immediate
                ? 'Subscription canceled immediately'
                : 'Subscription will be canceled at the end of the billing period',
        });

    } catch (error) {
        console.error('POST /api/subscription/cancel error:', error);
        return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
    }
}
