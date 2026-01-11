
const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addColumn() {
    try {
        console.log('Adding image_url column to forum_comments...');
        await client.execute("ALTER TABLE forum_comments ADD COLUMN image_url TEXT");
        console.log('Column added successfully.');
    } catch (error) {
        if (error.message.includes('duplicate column name')) {
            console.log('Column already exists.');
        } else {
            console.error('Error adding column:', error);
        }
    }
}

addColumn();
