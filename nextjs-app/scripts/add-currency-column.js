const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
    console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
    process.exit(1);
}

const client = createClient({
    url,
    authToken,
});

async function main() {
    try {
        console.log('Checking user_profiles table...');

        // Check columns
        const result = await client.execute("PRAGMA table_info(user_profiles)");
        const columns = result.rows.map(r => r.name);

        if (columns.includes('currency')) {
            console.log('Currency column already exists.');
            return;
        }

        console.log('Adding currency column to user_profiles...');
        await client.execute("ALTER TABLE user_profiles ADD COLUMN currency TEXT DEFAULT 'USD'");
        console.log('Successfully added currency column!');

    } catch (error) {
        console.error('Error adding currency column:', error);
    }
}

main();
