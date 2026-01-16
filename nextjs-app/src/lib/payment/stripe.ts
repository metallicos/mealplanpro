/**
 * Stripe Payment Gateway Implementation
 */

import { PaymentGateway, CheckoutResult, WebhookResult } from './index';
import { getStripeKeys, getPaymentSettings } from './settings';
import { query } from '../db';

export class StripeGateway implements PaymentGateway {
    name = 'stripe';

    private async getStripe() {
        const keys = await getStripeKeys();
        if (!keys || !keys.secretKey) {
            throw new Error('Stripe is not configured');
        }

        // Dynamic import to avoid loading Stripe if not needed
        const Stripe = (await import('stripe')).default;
        return new Stripe(keys.secretKey);
    }

    async createCheckout(
        userId: number,
        email: string,
        successUrl: string,
        cancelUrl: string
    ): Promise<CheckoutResult> {
        const stripe = await this.getStripe();
        const settings = await getPaymentSettings();

        // Get or create Stripe customer
        let customerId: string | undefined;

        // Check if user already has a Stripe customer ID
        const existingSub = await query<{ provider_customer_id: string }[]>(
            `SELECT provider_customer_id FROM subscriptions 
             WHERE user_id = ? AND payment_provider = 'stripe'`,
            [userId]
        );

        if (existingSub[0]?.provider_customer_id) {
            customerId = existingSub[0].provider_customer_id;
        } else {
            // Create new customer
            const customer = await stripe.customers.create({
                email,
                metadata: { userId: userId.toString() }
            });
            customerId = customer.id;
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: settings.stripe_price_id,
                    quantity: 1,
                }
            ],
            mode: 'subscription',
            success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl,
            metadata: {
                userId: userId.toString()
            },
            subscription_data: {
                metadata: {
                    userId: userId.toString()
                }
            }
        });

        return {
            url: session.url!,
            sessionId: session.id
        };
    }

    async handleWebhook(payload: string, signature?: string): Promise<WebhookResult> {
        const stripe = await this.getStripe();
        const settings = await getPaymentSettings();

        if (!signature) {
            throw new Error('Missing Stripe signature');
        }

        // Verify webhook signature
        const event = stripe.webhooks.constructEvent(
            payload,
            signature,
            settings.stripe_webhook_secret
        );

        const result: WebhookResult = {
            event: event.type,
            data: event.data.object as unknown as Record<string, unknown>
        };

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as any;
                result.userId = parseInt(session.metadata?.userId || '0', 10);
                result.customerId = session.customer;
                result.subscriptionId = session.subscription;
                break;
            }

            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as any;
                result.subscriptionId = subscription.id;
                result.customerId = subscription.customer;
                result.userId = parseInt(subscription.metadata?.userId || '0', 10);
                break;
            }

            case 'invoice.payment_succeeded':
            case 'invoice.payment_failed': {
                const invoice = event.data.object as any;
                result.subscriptionId = invoice.subscription;
                result.customerId = invoice.customer;
                break;
            }
        }

        return result;
    }

    async cancelSubscription(subscriptionId: string): Promise<boolean> {
        try {
            const stripe = await this.getStripe();
            await stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: true
            });
            return true;
        } catch (error) {
            console.error('Failed to cancel Stripe subscription:', error);
            return false;
        }
    }

    async getCustomerPortalUrl(customerId: string): Promise<string> {
        const stripe = await this.getStripe();
        const settings = await getPaymentSettings();

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile`,
        });

        return session.url;
    }
}
