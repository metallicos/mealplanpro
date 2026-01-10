const { createClient } = require('@libsql/client');
const path = require('path');
const dotenv = require('dotenv');

// Load .env explicitly
const envPath = path.resolve(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

console.log('Loading .env from:', envPath);
if (result.error) console.log('Error loading .env:', result.error.message);

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
    console.log('SKIP: TURSO_DATABASE_URL not found.');
    process.exit(0);
}

if (!url.includes('turso.io')) {
    console.log('NOTE: URL does not look like Turso cloud (might be local):', url);
} else {
    console.log('Connecting to Turso Cloud DB...');
}

const client = createClient({ url, authToken });

async function check() {
    try {
        const res = await client.execute("PRAGMA table_info(user_profiles)");
        const columns = res.rows.map(r => r.name);
        console.log('Columns in user_profiles:', columns.join(', '));

        const required = ['diet_mode', 'neck', 'waist', 'hip'];
        const missing = required.filter(c => !columns.includes(c));

        if (missing.length === 0) {
            console.log('SUCCESS: All required columns (diet_mode, neck, waist, hip) are present.');
        } else {
            console.log('FAILURE: Missing columns:', missing.join(', '));
        }
    } catch (e) {
        console.error('Error querying DB:', e.message);
    }
}
check();
