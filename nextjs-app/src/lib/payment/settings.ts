/**
 * Payment Settings Helper
 * Retrieves payment configuration from system_settings table
 */

import { query } from '../db';

export interface PaymentSettings {
    // General
    payment_premium_price_usd: string;
    payment_premium_price_mad: string;
    payment_trial_days: string;

    // Stripe
    stripe_enabled: string;
    stripe_mode: 'test' | 'live';
    stripe_test_publishable_key: string;
    stripe_test_secret_key: string;
    stripe_live_publishable_key: string;
    stripe_live_secret_key: string;
    stripe_webhook_secret: string;
    stripe_price_id: string;

    // PayPal
    paypal_enabled: string;
    paypal_mode: 'sandbox' | 'live';
    paypal_sandbox_client_id: string;
    paypal_sandbox_secret: string;
    paypal_live_client_id: string;
    paypal_live_secret: string;
    paypal_plan_id: string;

    // CMI
    cmi_enabled: string;
    cmi_mode: 'test' | 'live';
    cmi_merchant_id: string;
    cmi_store_key: string;
    cmi_ok_url: string;
    cmi_fail_url: string;
}

const DEFAULTS: Partial<PaymentSettings> = {
    payment_premium_price_usd: '2.99',
    payment_premium_price_mad: '29',
    payment_trial_days: '14',
    stripe_enabled: 'false',
    stripe_mode: 'test',
    paypal_enabled: 'false',
    paypal_mode: 'sandbox',
    cmi_enabled: 'false',
    cmi_mode: 'test',
};

/**
 * Get all payment settings from database
 */
export async function getPaymentSettings(): Promise<PaymentSettings> {
    const results = await query<{ key: string; value: string }[]>(
        `SELECT key, value FROM system_settings 
         WHERE key LIKE 'payment_%' 
            OR key LIKE 'stripe_%' 
            OR key LIKE 'paypal_%' 
            OR key LIKE 'cmi_%'`
    );

    const settings: Record<string, string> = { ...DEFAULTS };

    for (const row of results) {
        settings[row.key] = row.value;
    }

    return settings as unknown as PaymentSettings;
}

/**
 * Get a single payment setting
 */
export async function getPaymentSetting(key: string): Promise<string | null> {
    const results = await query<{ value: string }[]>(
        'SELECT value FROM system_settings WHERE key = ?',
        [key]
    );
    return results[0]?.value || (DEFAULTS as Record<string, string>)[key] || null;
}

/**
 * Save a payment setting
 */
export async function setPaymentSetting(key: string, value: string): Promise<void> {
    await query(
        `INSERT INTO system_settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [key, value]
    );
}

/**
 * Save multiple payment settings
 */
export async function setPaymentSettings(settings: Partial<PaymentSettings>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
        if (value !== undefined) {
            await setPaymentSetting(key, String(value));
        }
    }
}

/**
 * Get active Stripe keys based on mode
 */
export async function getStripeKeys(): Promise<{ publishableKey: string; secretKey: string } | null> {
    const settings = await getPaymentSettings();

    if (settings.stripe_enabled !== 'true') return null;

    const isLive = settings.stripe_mode === 'live';

    return {
        publishableKey: isLive ? settings.stripe_live_publishable_key : settings.stripe_test_publishable_key,
        secretKey: isLive ? settings.stripe_live_secret_key : settings.stripe_test_secret_key,
    };
}

/**
 * Get active PayPal credentials based on mode
 */
export async function getPayPalCredentials(): Promise<{ clientId: string; secret: string } | null> {
    const settings = await getPaymentSettings();

    if (settings.paypal_enabled !== 'true') return null;

    const isLive = settings.paypal_mode === 'live';

    return {
        clientId: isLive ? settings.paypal_live_client_id : settings.paypal_sandbox_client_id,
        secret: isLive ? settings.paypal_live_secret : settings.paypal_sandbox_secret,
    };
}

/**
 * Get CMI credentials
 */
export async function getCMICredentials(): Promise<{ merchantId: string; storeKey: string; okUrl: string; failUrl: string } | null> {
    const settings = await getPaymentSettings();

    if (settings.cmi_enabled !== 'true') return null;

    return {
        merchantId: settings.cmi_merchant_id,
        storeKey: settings.cmi_store_key,
        okUrl: settings.cmi_ok_url,
        failUrl: settings.cmi_fail_url,
    };
}

/**
 * Get list of enabled payment gateways
 */
export async function getEnabledGateways(userLocale?: string): Promise<string[]> {
    const settings = await getPaymentSettings();
    const gateways: string[] = [];

    if (settings.stripe_enabled === 'true') gateways.push('stripe');
    if (settings.paypal_enabled === 'true') gateways.push('paypal');

    // CMI only for Moroccan users (locale starts with 'ar' or country is MA)
    if (settings.cmi_enabled === 'true') {
        if (!userLocale || userLocale.includes('MA') || userLocale.startsWith('ar')) {
            gateways.push('cmi');
        }
    }

    return gateways;
}

/**
 * Get premium price for a currency
 */
export async function getPremiumPrice(currency: 'USD' | 'MAD' = 'USD'): Promise<number> {
    const settings = await getPaymentSettings();

    if (currency === 'MAD') {
        return parseFloat(settings.payment_premium_price_mad) || 29;
    }
    return parseFloat(settings.payment_premium_price_usd) || 2.99;
}

/**
 * Get trial period in days
 */
export async function getTrialDays(): Promise<number> {
    const setting = await getPaymentSetting('payment_trial_days');
    return parseInt(setting || '14', 10);
}
