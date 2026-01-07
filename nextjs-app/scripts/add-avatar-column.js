const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const client = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:./local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
    try {
        console.log('Adding avatar_url column to user_profiles...');
        await client.execute(`
            ALTER TABLE user_profiles ADD COLUMN avatar_url TEXT;
        `);
        console.log('Migration successful');
    } catch (err) {
        if (err.message.includes('duplicate column')) {
            console.log('Column already exists');
        } else {
            console.error('Migration failed:', err);
        }
    }
}

main();
