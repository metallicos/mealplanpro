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
        console.log('Checking recipe 9456...');
        const r = await client.execute({ sql: 'SELECT * FROM recipes WHERE id = 9456', args: [] });
        console.log('Recipe:', r.rows[0]);

        const t = await client.execute({ sql: 'SELECT * FROM recipe_translations WHERE recipe_id = 9456', args: [] });
        console.log('Translations:', t.rows);
    } catch (e) {
        console.error(e);
    }
}

check();
