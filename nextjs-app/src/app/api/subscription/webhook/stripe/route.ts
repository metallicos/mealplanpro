import { NextRequest, NextResponse } from 'next/server';
import { getGateway } from '@/lib/payment';
import { activateSubscription, cancelSubscription } from '@/lib/subscription';
import { query } from '@/lib/db';

/**
 * POST /api/subscription/webhook/stripe
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
    try {
        const payload = await request.text();
        const signature = request.headers.get('stripe-signature');

        if (!signature) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
        }

        const gateway = await getGateway('stripe');
        const result = await gateway.handleWebhook(payload, signature);

        console.log('Stripe webhook event:', result.event);

        switch (result.event) {
            case 'checkout.session.completed': {
                // User completed checkout - activate subscription
                if (result.userId && result.subscriptionId && result.customerId) {
                    // Get subscription details from Stripe
                    const periodEnd = new Date();
                    periodEnd.setMonth(periodEnd.getMonth() + 1);

                    await activateSubscription(
                        result.userId,
                        'stripe',
                        result.customerId,
                        result.subscriptionId,
                        periodEnd
                    );

                    // Log transaction
                    await query(
                        `INSERT INTO payment_transactions (user_id, provider, provider_transaction_id, amount, currency, status)
                         VALUES (?, 'stripe', ?, ?, 'USD', 'completed')`,
                        [result.userId, result.subscriptionId, 2.99] // TODO: Get actual amount
                    );
                }
                break;
            }

            case 'customer.subscription.updated': {
                const data = result.data as any;
                if (result.userId) {
                    // Update period end date
                    const periodEnd = new Date(data.current_period_end * 1000);
                    await query(
                        `UPDATE subscriptions 
                         SET current_period_end = ?, updated_at = CURRENT_TIMESTAMP
                         WHERE user_id = ?`,
                        [periodEnd.toISOString(), result.userId]
                    );

                    // Check if set to cancel at period end
                    if (data.cancel_at_period_end) {
                        await query(
                            `UPDATE subscriptions 
                             SET cancel_at_period_end = 1, updated_at = CURRENT_TIMESTAMP
                             WHERE user_id = ?`,
                            [result.userId]
                        );
                    }
                }
                break;
            }

            case 'customer.subscription.deleted': {
                // Subscription was canceled/expired
                if (result.userId) {
                    await cancelSubscription(result.userId, false);
                }
                break;
            }

            case 'invoice.payment_succeeded': {
                // Recurring payment succeeded
                const data = result.data as any;
                if (data.subscription) {
                    // Find user by subscription ID
                    const subs = await query<{ user_id: number }[]>(
                        `SELECT user_id FROM subscriptions WHERE provider_subscription_id = ?`,
                        [data.subscription]
                    );

                    if (subs[0]) {
                        // Update period end
                        const periodEnd = new Date();
                        periodEnd.setMonth(periodEnd.getMonth() + 1);

                        await query(
                            `UPDATE subscriptions 
                             SET status = 'active', 
                                 current_period_end = ?,
                                 updated_at = CURRENT_TIMESTAMP
                             WHERE user_id = ?`,
                            [periodEnd.toISOString(), subs[0].user_id]
                        );

                        // Log transaction
                        await query(
                            `INSERT INTO payment_transactions (user_id, provider, provider_transaction_id, amount, currency, status)
                             VALUES (?, 'stripe', ?, ?, 'USD', 'completed')`,
                            [subs[0].user_id, data.id, data.amount_paid / 100]
                        );
                    }
                }
                break;
            }

            case 'invoice.payment_failed': {
                // Payment failed
                const data = result.data as any;
                if (data.subscription) {
                    const subs = await query<{ user_id: number }[]>(
                        `SELECT user_id FROM subscriptions WHERE provider_subscription_id = ?`,
                        [data.subscription]
                    );

                    if (subs[0]) {
                        await query(
                            `UPDATE subscriptions 
                             SET status = 'past_due', updated_at = CURRENT_TIMESTAMP
                             WHERE user_id = ?`,
                            [subs[0].user_id]
                        );
                    }
                }
                break;
            }
        }

        return NextResponse.json({ received: true });

    } catch (error) {
        console.error('Stripe webhook error:', error);
        return NextResponse.json({
            error: 'Webhook handler failed',
            details: (error as Error).message
        }, { status: 400 });
    }
}
