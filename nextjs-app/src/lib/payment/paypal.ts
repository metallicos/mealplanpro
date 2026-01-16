/**
 * PayPal Payment Gateway Implementation
 */

import { PaymentGateway, CheckoutResult, WebhookResult } from './index';
import { getPayPalCredentials, getPaymentSettings } from './settings';

export class PayPalGateway implements PaymentGateway {
    name = 'paypal';

    private async getAccessToken(): Promise<string> {
        const credentials = await getPayPalCredentials();
        if (!credentials) {
            throw new Error('PayPal is not configured');
        }

        const settings = await getPaymentSettings();
        const isLive = settings.paypal_mode === 'live';
        const baseUrl = isLive
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        const auth = Buffer.from(`${credentials.clientId}:${credentials.secret}`).toString('base64');

        const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });

        if (!response.ok) {
            throw new Error('Failed to get PayPal access token');
        }

        const data = await response.json();
        return data.access_token;
    }

    private async getBaseUrl(): Promise<string> {
        const settings = await getPaymentSettings();
        const isLive = settings.paypal_mode === 'live';
        return isLive
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';
    }

    async createCheckout(
        userId: number,
        email: string,
        successUrl: string,
        cancelUrl: string
    ): Promise<CheckoutResult> {
        const accessToken = await this.getAccessToken();
        const baseUrl = await this.getBaseUrl();
        const settings = await getPaymentSettings();

        // Create subscription
        const response = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                plan_id: settings.paypal_plan_id,
                subscriber: {
                    email_address: email,
                },
                custom_id: userId.toString(),
                application_context: {
                    brand_name: 'Meal Plan Pro',
                    locale: 'en-US',
                    shipping_preference: 'NO_SHIPPING',
                    user_action: 'SUBSCRIBE_NOW',
                    return_url: `${successUrl}?provider=paypal`,
                    cancel_url: cancelUrl,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('PayPal subscription error:', error);
            throw new Error('Failed to create PayPal subscription');
        }

        const data = await response.json();

        // Find approval URL
        const approvalLink = data.links.find((link: any) => link.rel === 'approve');

        if (!approvalLink) {
            throw new Error('PayPal approval URL not found');
        }

        return {
            url: approvalLink.href,
            sessionId: data.id,
        };
    }

    async handleWebhook(payload: Record<string, unknown>): Promise<WebhookResult> {
        const eventType = payload.event_type as string;
        const resource = payload.resource as Record<string, unknown>;

        const result: WebhookResult = {
            event: eventType,
            data: resource,
        };

        switch (eventType) {
            case 'BILLING.SUBSCRIPTION.ACTIVATED':
            case 'BILLING.SUBSCRIPTION.UPDATED':
            case 'BILLING.SUBSCRIPTION.CANCELLED':
            case 'BILLING.SUBSCRIPTION.SUSPENDED': {
                result.subscriptionId = resource.id as string;
                result.userId = parseInt(resource.custom_id as string || '0', 10);
                break;
            }

            case 'PAYMENT.SALE.COMPLETED': {
                result.subscriptionId = resource.billing_agreement_id as string;
                break;
            }
        }

        return result;
    }

    async cancelSubscription(subscriptionId: string): Promise<boolean> {
        try {
            const accessToken = await this.getAccessToken();
            const baseUrl = await this.getBaseUrl();

            const response = await fetch(`${baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reason: 'User requested cancellation',
                }),
            });

            return response.ok || response.status === 204;
        } catch (error) {
            console.error('Failed to cancel PayPal subscription:', error);
            return false;
        }
    }
}
