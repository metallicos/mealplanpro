
const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function inspectSchema() {
    try {
        const result = await client.execute("PRAGMA table_info(forum_comments)");
        console.log('forum_comments columns:', result.rows);
    } catch (error) {
        console.error('Error:', error);
    }
}

inspectSchema();
