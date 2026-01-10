const { createClient } = require('@libsql/client');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

console.log('Connecting to database:', url);

const client = createClient({
    url,
    authToken,
});

async function migrate() {
    try {
        console.log('Adding diet_mode column...');
        await client.execute("ALTER TABLE user_profiles ADD COLUMN diet_mode TEXT DEFAULT 'normal'");
        console.log('Success.');
    } catch (e) {
        console.log('Info:', e.message);
    }

    try {
        console.log('Adding neck column...');
        await client.execute("ALTER TABLE user_profiles ADD COLUMN neck REAL DEFAULT 0");
        console.log('Success.');
    } catch (e) {
        console.log('Info:', e.message);
    }

    try {
        console.log('Adding waist column...');
        await client.execute("ALTER TABLE user_profiles ADD COLUMN waist REAL DEFAULT 0");
        console.log('Success.');
    } catch (e) {
        console.log('Info:', e.message);
    }

    try {
        console.log('Adding hip column...');
        await client.execute("ALTER TABLE user_profiles ADD COLUMN hip REAL DEFAULT 0");
        console.log('Success.');
    } catch (e) {
        console.log('Info:', e.message);
    }
}

migrate();
