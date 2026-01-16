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

        // Analytics tables
        try {
            await query(`
                CREATE TABLE IF NOT EXISTS page_views (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    user_id INTEGER,
                    page_path TEXT NOT NULL,
                    referrer TEXT,
                    user_agent TEXT,
                    ip_hash TEXT,
                    country TEXT,
                    device_type TEXT,
                    browser TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            `);
            console.log('Created page_views table');
        } catch (e) {
            console.log('page_views table error:', e);
        }

        try {
            await query(`
                CREATE TABLE IF NOT EXISTS daily_stats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date TEXT NOT NULL UNIQUE,
                    page_views INTEGER DEFAULT 0,
                    unique_visitors INTEGER DEFAULT 0,
                    new_users INTEGER DEFAULT 0,
                    returning_users INTEGER DEFAULT 0,
                    mobile_visits INTEGER DEFAULT 0,
                    desktop_visits INTEGER DEFAULT 0,
                    tablet_visits INTEGER DEFAULT 0,
                    avg_session_duration INTEGER DEFAULT 0,
                    bounce_rate REAL DEFAULT 0,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now'))
                )
            `);
            console.log('Created daily_stats table');
        } catch (e) {
            console.log('daily_stats table error:', e);
        }

        try {
            await query(`
                CREATE TABLE IF NOT EXISTS subscription_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    event_type TEXT NOT NULL,
                    subscription_id INTEGER,
                    payment_provider TEXT,
                    amount REAL,
                    currency TEXT DEFAULT 'USD',
                    metadata TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            `);
            console.log('Created subscription_events table');
        } catch (e) {
            console.log('subscription_events table error:', e);
        }

        try {
            await query(`
                CREATE TABLE IF NOT EXISTS monthly_revenue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    month TEXT NOT NULL UNIQUE,
                    mrr REAL DEFAULT 0,
                    new_subscriptions INTEGER DEFAULT 0,
                    churned_subscriptions INTEGER DEFAULT 0,
                    trial_conversions INTEGER DEFAULT 0,
                    total_revenue REAL DEFAULT 0,
                    refunds REAL DEFAULT 0,
                    net_revenue REAL DEFAULT 0,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now'))
                )
            `);
            console.log('Created monthly_revenue table');
        } catch (e) {
            console.log('monthly_revenue table error:', e);
        }

        // Create indexes for analytics
        try {
            await query('CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at)');
            await query('CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(session_id)');
            await query('CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(page_path)');
            console.log('Created analytics indexes');
        } catch (e) {
            console.log('Index creation error:', e);
        }

        return NextResponse.json({ success: true, message: 'Migration completed' });
    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
    }
}
