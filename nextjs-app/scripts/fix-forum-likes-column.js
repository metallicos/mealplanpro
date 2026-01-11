const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

async function run() {
    try {
        console.log('Inspecting forum_posts columns...');
        const result = await client.execute("PRAGMA table_info(forum_posts)");
        const columns = result.rows.map(r => r.name);
        console.log('Columns:', columns);

        if (!columns.includes('likes')) {
            console.log('Adding missing "likes" column...');
            await client.execute("ALTER TABLE forum_posts ADD COLUMN likes INTEGER DEFAULT 0");
            console.log('Column added successfully.');
        } else {
            console.log('"likes" column already exists.');
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
