import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        // Add username column
        try {
            await query('ALTER TABLE users ADD COLUMN username TEXT UNIQUE');
            console.log('Added username column');
        } catch (e) {
            console.log('username column might already exist or error:', e);
        }

        // Add newsletter_subscribed column
        try {
            await query('ALTER TABLE users ADD COLUMN newsletter_subscribed INTEGER DEFAULT 0');
            console.log('Added newsletter_subscribed column');
        } catch (e) {
            console.log('newsletter_subscribed column might already exist or error:', e);
        }

        // Add terms_accepted_at column
        try {
            await query('ALTER TABLE users ADD COLUMN terms_accepted_at TEXT');
            console.log('Added terms_accepted_at column');
        } catch (e) {
            console.log('terms_accepted_at column might already exist or error:', e);
        }

        return NextResponse.json({ success: true, message: 'Migration attempted' });
    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
    }
}
