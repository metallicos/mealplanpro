const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

async function check() {
    try {
        console.log('Checking tables...');
        const r = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
        const tables = r.rows.map(row => row.name);
        console.log('Tables:', tables);

        if (tables.includes('forum_likes')) {
            console.log('forum_likes exists.');
        } else {
            console.log('forum_likes MISSING.');
        }
    } catch (e) {
        console.error(e);
    }
}

check();
