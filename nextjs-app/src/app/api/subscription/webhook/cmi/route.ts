import { NextRequest, NextResponse } from 'next/server';
import { activateSubscription } from '@/lib/subscription';
import { query } from '@/lib/db';
import { getPremiumPrice } from '@/lib/payment/settings';

/**
 * POST /api/subscription/webhook/cmi
 * Handle CMI (Morocco) payment callback
 */
export async function POST(request: NextRequest) {
    try {
        // CMI sends form data or query params
        const formData = await request.formData();
        const params: Record<string, string> = {};

        formData.forEach((value, key) => {
            params[key] = value.toString();
        });

        console.log('CMI callback received:', params);

        const {
            oid,          // Order ID (format: MPP-{userId}-{timestamp})
            Response,     // 'Approved' or 'Declined'
            ProcReturnCode,
            TransId,
            amount,
        } = params;

        // Extract userId from order ID
        let userId: number | null = null;
        if (oid) {
            const parts = oid.split('-');
            if (parts.length >= 2) {
                userId = parseInt(parts[1], 10);
            }
        }

        if (!userId) {
            console.error('CMI callback: Could not extract user ID from order:', oid);
            return NextResponse.redirect(new URL('/subscription/failed?reason=invalid_order', request.url));
        }

        if (Response === 'Approved') {
            // Payment successful
            const price = await getPremiumPrice('MAD');

            // For CMI, we'll handle monthly renewals manually
            // Set period end to 1 month from now
            const periodEnd = new Date();
            periodEnd.setMonth(periodEnd.getMonth() + 1);

            await activateSubscription(
                userId,
                'cmi',
                oid,      // Use order ID as customer ID
                oid,      // Use order ID as subscription ID
                periodEnd
            );

            // Log transaction
            await query(
                `INSERT INTO payment_transactions (user_id, provider, provider_transaction_id, amount, currency, status, metadata)
                 VALUES (?, 'cmi', ?, ?, 'MAD', 'completed', ?)`,
                [userId, TransId || oid, parseFloat(amount) || price, JSON.stringify(params)]
            );

            // Update the pending transaction if it exists
            await query(
                `UPDATE payment_transactions 
                 SET status = 'completed', provider_transaction_id = ?
                 WHERE provider_transaction_id = ? AND status = 'pending'`,
                [TransId || oid, oid]
            );

            // Redirect to success page
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            return NextResponse.redirect(new URL('/subscription/success?provider=cmi', appUrl));

        } else {
            // Payment failed
            console.error('CMI payment failed:', { oid, Response, ProcReturnCode });

            // Update transaction status
            await query(
                `UPDATE payment_transactions 
                 SET status = 'failed'
                 WHERE provider_transaction_id = ? AND status = 'pending'`,
                [oid]
            );

            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            return NextResponse.redirect(new URL(`/subscription/failed?reason=${ProcReturnCode}`, appUrl));
        }

    } catch (error) {
        console.error('CMI webhook error:', error);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        return NextResponse.redirect(new URL('/subscription/failed?reason=error', appUrl));
    }
}

// CMI might also send GET requests for some callbacks
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    // Convert query params to formData-like object and reuse POST handler logic
    const oid = searchParams.get('orderId') || searchParams.get('oid');
    const response = searchParams.get('Response') || searchParams.get('response');

    if (response === 'Approved' && oid) {
        // Simple success redirect
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        return NextResponse.redirect(new URL('/subscription/success?provider=cmi', appUrl));
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(new URL('/subscription/failed', appUrl));
}
