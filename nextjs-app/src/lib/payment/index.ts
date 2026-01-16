/**
 * Payment Gateway Factory
 * Provides a unified interface for all payment providers
 */

import { getPaymentSettings, getEnabledGateways } from './settings';

// Gateway interface
export interface CheckoutResult {
    url: string;
    sessionId?: string;
}

export interface WebhookResult {
    event: string;
    userId?: number;
    subscriptionId?: string;
    customerId?: string;
    data?: Record<string, unknown>;
}

export interface PaymentGateway {
    name: string;

    createCheckout(
        userId: number,
        email: string,
        successUrl: string,
        cancelUrl: string
    ): Promise<CheckoutResult>;

    handleWebhook(
        payload: string | Record<string, unknown>,
        signature?: string
    ): Promise<WebhookResult>;

    cancelSubscription(subscriptionId: string): Promise<boolean>;

    getCustomerPortalUrl?(customerId: string): Promise<string>;
}

// Gateway implementations will be dynamically imported
let stripeGateway: PaymentGateway | null = null;
let paypalGateway: PaymentGateway | null = null;
let cmiGateway: PaymentGateway | null = null;

/**
 * Get a payment gateway by name
 */
export async function getGateway(provider: string): Promise<PaymentGateway> {
    switch (provider) {
        case 'stripe':
            if (!stripeGateway) {
                const { StripeGateway } = await import('./stripe');
                stripeGateway = new StripeGateway();
            }
            return stripeGateway;

        case 'paypal':
            if (!paypalGateway) {
                const { PayPalGateway } = await import('./paypal');
                paypalGateway = new PayPalGateway();
            }
            return paypalGateway;

        case 'cmi':
            if (!cmiGateway) {
                const { CMIGateway } = await import('./cmi');
                cmiGateway = new CMIGateway();
            }
            return cmiGateway;

        default:
            throw new Error(`Unknown payment provider: ${provider}`);
    }
}

/**
 * Get all available payment gateways for a user
 */
export async function getAvailableGateways(userLocale?: string): Promise<{
    name: string;
    displayName: string;
    icon: string;
    currency: string;
}[]> {
    const enabledGateways = await getEnabledGateways(userLocale);

    const gatewayInfo: Record<string, { displayName: string; icon: string; currency: string }> = {
        stripe: {
            displayName: 'Credit Card',
            icon: 'credit-card',
            currency: 'USD'
        },
        paypal: {
            displayName: 'PayPal',
            icon: 'paypal',
            currency: 'USD'
        },
        cmi: {
            displayName: 'CMI (Morocco)',
            icon: 'building-bank',
            currency: 'MAD'
        }
    };

    return enabledGateways.map(name => ({
        name,
        ...(gatewayInfo[name] || { displayName: name, icon: 'wallet', currency: 'USD' })
    }));
}

/**
 * Create a checkout session with any available gateway
 */
export async function createCheckout(
    provider: string,
    userId: number,
    email: string,
    successUrl: string,
    cancelUrl: string
): Promise<CheckoutResult> {
    const gateway = await getGateway(provider);
    return gateway.createCheckout(userId, email, successUrl, cancelUrl);
}

// Re-export settings functions
export { getPaymentSettings, getEnabledGateways } from './settings';
