import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Request password reset - generates a reset token
export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Check if user exists
        const users = await query('SELECT id, email FROM users WHERE email = ?', [email.toLowerCase()]);
        const user = (users as any[])[0];

        if (!user) {
            // Don't reveal if email exists or not (security)
            return NextResponse.json({
                success: true,
                message: 'If an account exists with this email, a reset link has been sent.'
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = await bcrypt.hash(resetToken, 10);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        // Store reset token in database
        await query(
            `INSERT INTO password_resets (user_id, token_hash, expires_at) 
             VALUES (?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET 
                token_hash = excluded.token_hash, 
                expires_at = excluded.expires_at,
                created_at = CURRENT_TIMESTAMP`,
            [user.id, resetTokenHash, expiresAt.toISOString()]
        );

        // In production, send email here
        // For now, we'll just return success (and log the token for testing)
        console.log(`[DEV] Password reset token for ${email}: ${resetToken}`);

        return NextResponse.json({
            success: true,
            message: 'If an account exists with this email, a reset link has been sent.',
            // Only include token in development for testing
            ...(process.env.NODE_ENV === 'development' ? { dev_token: resetToken } : {})
        });

    } catch (error) {
        console.error('Password reset request error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
