const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');

const path = require('path');
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
        console.log('Adding theme_preference column to user_profiles...');

        await client.execute(`
            ALTER TABLE user_profiles 
            ADD COLUMN theme_preference TEXT DEFAULT 'auto';
        `);

        console.log('Column theme_preference added successfully!');

    } catch (error) {
        if (error.message.includes('duplicate column name')) {
            console.log('Column theme_preference already exists.');
        } else {
            console.error('Error altering table:', error);
        }
    }
}

main();
