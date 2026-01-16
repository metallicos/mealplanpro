import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

// All payment setting keys that can be configured
const PAYMENT_SETTING_KEYS = [
    // General
    'payment_premium_price_usd',
    'payment_premium_price_mad',
    'payment_trial_days',

    // Stripe
    'stripe_enabled',
    'stripe_mode',
    'stripe_test_publishable_key',
    'stripe_test_secret_key',
    'stripe_live_publishable_key',
    'stripe_live_secret_key',
    'stripe_webhook_secret',
    'stripe_price_id',

    // PayPal
    'paypal_enabled',
    'paypal_mode',
    'paypal_sandbox_client_id',
    'paypal_sandbox_secret',
    'paypal_live_client_id',
    'paypal_live_secret',
    'paypal_plan_id',

    // CMI
    'cmi_enabled',
    'cmi_mode',
    'cmi_merchant_id',
    'cmi_store_key',
    'cmi_ok_url',
    'cmi_fail_url',
];

// Default values for settings
const DEFAULTS: Record<string, string> = {
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

// GET - Fetch payment settings
export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Build query to get all payment-related settings
        const settings = await query<{ key: string; value: string }[]>(
            `SELECT key, value FROM system_settings 
             WHERE key LIKE 'payment_%' 
                OR key LIKE 'stripe_%' 
                OR key LIKE 'paypal_%' 
                OR key LIKE 'cmi_%'`
        );

        // Convert array to object with defaults
        const config: Record<string, string> = { ...DEFAULTS };
        settings.forEach(row => {
            config[row.key] = row.value;
        });

        return NextResponse.json(config);

    } catch (error) {
        console.error('GET /api/admin/settings/payments error:', error);
        return NextResponse.json({ error: 'Failed to fetch payment settings' }, { status: 500 });
    }
}

// POST - Update payment settings
export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Only allow whitelisted keys to be saved
        for (const key of PAYMENT_SETTING_KEYS) {
            if (body[key] !== undefined) {
                // Upsert logic
                await query(
                    `INSERT INTO system_settings (key, value) VALUES (?, ?) 
                     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
                    [key, String(body[key])]
                );
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('POST /api/admin/settings/payments error:', error);
        return NextResponse.json({ error: 'Failed to save payment settings' }, { status: 500 });
    }
}
