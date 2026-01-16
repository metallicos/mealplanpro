import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword, signToken, setSession } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { welcomeEmail } from '@/lib/email-templates';
import { createTrialSubscription } from '@/lib/subscription';

export async function POST(request: NextRequest) {
    try {
        const { email, password, full_name, family_name, gender, acceptTerms, newsletter, username } = await request.json();

        if (!email || !password || !full_name || !username) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!acceptTerms) {
            return NextResponse.json({ error: 'You must accept the Terms of Service' }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase();

        // 1. Check if email or username exists
        const existingUsers = await query('SELECT id FROM users WHERE email = ? OR username = ?', [normalizedEmail, username]);
        if ((existingUsers as any[]).length > 0) {
            const exists = (existingUsers as any[])[0];
            // Basic check, could be more specific
            return NextResponse.json({ error: 'Email or Username already registered' }, { status: 409 });
        }

        // 2. Hash password
        const hashedPassword = await hashPassword(password);

        // 3. Create User
        const termsAcceptedAt = new Date().toISOString();
        const userResult = await query(`
            INSERT INTO users (email, username, password_hash, full_name, role, newsletter_subscribed, terms_accepted_at) 
            VALUES (?, ?, ?, ?, 'master', ?, ?)
            RETURNING id
        `, [normalizedEmail, username, hashedPassword, full_name, newsletter ? 1 : 0, termsAcceptedAt]);

        const userId = (userResult as any[])[0]?.id;

        if (!userId) {
            throw new Error("Failed to create user");
        }

        // 4. Create Household
        const householdName = family_name || `${full_name.split(' ')[0]}'s Family`;
        const householdResult = await query(`
            INSERT INTO households (master_user_id, name)
            VALUES (?, ?)
            RETURNING id
        `, [userId, householdName]);

        const householdId = (householdResult as any[])[0]?.id;

        // 5. Update User with Household ID
        await query('UPDATE users SET household_id = ? WHERE id = ?', [householdId, userId]);

        // 6. Create Initial Profile
        await query(`
            INSERT INTO user_profiles (user_id, gender) VALUES (?, ?)
        `, [userId, gender || 'male']);

        // 7. Create Trial Subscription (14-day free premium access)
        try {
            await createTrialSubscription(userId, 14);
        } catch (subError) {
            console.error('Failed to create trial subscription:', subError);
            // Don't block signup on subscription creation failure
        }

        // 7. Auto Login
        const token = await signToken({
            id: userId,
            email: normalizedEmail,
            role: 'master',
            householdId
        });

        await setSession(token);

        // 8. Send Welcome Email
        try {
            await sendEmail(
                normalizedEmail,
                'Welcome to Meal Plan Pro!',
                welcomeEmail(full_name, normalizedEmail) // Using full name for welcome, but username is stored
            );
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't block signup on email failure
        }

        return NextResponse.json({ success: true, user: { id: userId, email: normalizedEmail, username, full_name, role: 'master', householdId } });

    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }
}
