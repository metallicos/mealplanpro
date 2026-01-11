
const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function listTables() {
    try {
        const result = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('Tables:', result.rows.map(r => r.name));
    } catch (error) {
        console.error(error);
    }
}

listTables();
