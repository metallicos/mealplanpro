import { NextRequest, NextResponse } from 'next/server';
import { getGateway } from '@/lib/payment';
import { activateSubscription, cancelSubscription } from '@/lib/subscription';
import { query } from '@/lib/db';

/**
 * POST /api/subscription/webhook/paypal
 * Handle PayPal webhook events
 */
export async function POST(request: NextRequest) {
    try {
        const payload = await request.json();

        const gateway = await getGateway('paypal');
        const result = await gateway.handleWebhook(payload);

        console.log('PayPal webhook event:', result.event);

        switch (result.event) {
            case 'BILLING.SUBSCRIPTION.ACTIVATED': {
                // Subscription activated
                if (result.userId && result.subscriptionId) {
                    const periodEnd = new Date();
                    periodEnd.setMonth(periodEnd.getMonth() + 1);

                    await activateSubscription(
                        result.userId,
                        'paypal',
                        result.subscriptionId, // PayPal uses subscription ID as customer ID too
                        result.subscriptionId,
                        periodEnd
                    );

                    // Log transaction
                    await query(
                        `INSERT INTO payment_transactions (user_id, provider, provider_transaction_id, amount, currency, status)
                         VALUES (?, 'paypal', ?, ?, 'USD', 'completed')`,
                        [result.userId, result.subscriptionId, 2.99]
                    );
                }
                break;
            }

            case 'BILLING.SUBSCRIPTION.CANCELLED':
            case 'BILLING.SUBSCRIPTION.SUSPENDED': {
                // Subscription cancelled or suspended
                if (result.userId) {
                    await cancelSubscription(result.userId, false);
                }
                break;
            }

            case 'PAYMENT.SALE.COMPLETED': {
                // Recurring payment completed
                const data = result.data as any;
                if (result.subscriptionId) {
                    // Find user by subscription ID
                    const subs = await query<{ user_id: number }[]>(
                        `SELECT user_id FROM subscriptions WHERE provider_subscription_id = ?`,
                        [result.subscriptionId]
                    );

                    if (subs[0]) {
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
                             VALUES (?, 'paypal', ?, ?, 'USD', 'completed')`,
                            [subs[0].user_id, data.id, data.amount?.total || 2.99]
                        );
                    }
                }
                break;
            }
        }

        return NextResponse.json({ received: true });

    } catch (error) {
        console.error('PayPal webhook error:', error);
        return NextResponse.json({
            error: 'Webhook handler failed',
            details: (error as Error).message
        }, { status: 400 });
    }
}
