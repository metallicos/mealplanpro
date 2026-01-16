
import { query } from '../src/lib/db';

async function migrate() {
    console.log('Starting migration...');
    try {
        // Add username column (SQLite doesn't support adding UNIQUE directly)
        try {
            await query('ALTER TABLE users ADD COLUMN username TEXT');
            console.log('✅ Added username column');
        } catch (e: any) {
            console.log('ℹ️  username column skip:', e.message);
        }

        try {
            await query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)');
            console.log('✅ Created unique index for username');
        } catch (e: any) {
            console.log('ℹ️  username index skip:', e.message);
        }

        // Add newsletter_subscribed column
        try {
            await query('ALTER TABLE users ADD COLUMN newsletter_subscribed INTEGER DEFAULT 0');
            console.log('✅ Added newsletter_subscribed column');
        } catch (e: any) {
            console.log('ℹ️  newsletter_subscribed column skip:', e.message);
        }

        // Add terms_accepted_at column
        try {
            await query('ALTER TABLE users ADD COLUMN terms_accepted_at TEXT');
            console.log('✅ Added terms_accepted_at column');
        } catch (e: any) {
            console.log('ℹ️  terms_accepted_at column skip:', e.message);
        }

        // Create system_settings table
        try {
            await query(`
                CREATE TABLE IF NOT EXISTS system_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT
                )
            `);
            console.log('✅ Created system_settings table');
        } catch (e: any) {
            console.log('ℹ️  system_settings table skip:', e.message);
        }

        console.log('Migration completed.');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
