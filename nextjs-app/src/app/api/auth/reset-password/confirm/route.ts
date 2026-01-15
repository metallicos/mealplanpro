import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Verify token and reset password
export async function POST(request: NextRequest) {
    try {
        const { token, newPassword } = await request.json();

        if (!token || !newPassword) {
            return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        // Get all valid (non-expired) password reset records
        const resets = await query(
            `SELECT pr.*, u.email, u.name 
             FROM password_resets pr 
             JOIN users u ON pr.user_id = u.id 
             WHERE pr.expires_at > datetime('now')`,
            []
        );

        // Find the matching token
        let matchingReset = null;
        for (const reset of resets as any[]) {
            const isMatch = await bcrypt.compare(token, reset.token_hash);
            if (isMatch) {
                matchingReset = reset;
                break;
            }
        }

        if (!matchingReset) {
            return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update user's password
        await query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, matchingReset.user_id]);

        // Delete the used reset token
        await query('DELETE FROM password_resets WHERE user_id = ?', [matchingReset.user_id]);

        return NextResponse.json({
            success: true,
            message: 'Password has been reset successfully. You can now log in with your new password.'
        });

    } catch (error) {
        console.error('Password reset confirm error:', error);
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }
}
