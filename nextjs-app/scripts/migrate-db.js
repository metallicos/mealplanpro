const { createClient } = require('@libsql/client');
const path = require('path');
const dotenv = require('dotenv');

// Load .env explicitly
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

console.log('Connecting to database:', url);

const client = createClient({
    url,
    authToken,
});

async function addColumn(table, colName, colType) {
    try {
        console.log(`Adding ${colName} to ${table}...`);
        await client.execute(`ALTER TABLE ${table} ADD COLUMN ${colName} ${colType}`);
        console.log('Success.');
    } catch (e) {
        if (e.message.includes('duplicate column')) {
            console.log(`Column ${colName} already exists in ${table}.`);
        } else {
            console.log(`Error adding ${colName} to ${table}:`, e.message);
        }
    }
}

async function verifyTable(table) {
    try {
        const res = await client.execute(`PRAGMA table_info(${table})`);
        const columns = res.rows.map(r => r.name);
        console.log(`VERIFY ${table} columns:`, columns.join(', '));
    } catch (e) {
        console.log(`Error verifying ${table}:`, e.message);
    }
}

async function migrate() {
    // Legacy columns missing in v2 (user_profiles)
    await addColumn('user_profiles', 'weight', 'REAL DEFAULT 0');
    await addColumn('user_profiles', 'height', 'REAL DEFAULT 0');
    await addColumn('user_profiles', 'age', 'INTEGER DEFAULT 0');
    await addColumn('user_profiles', 'goal', "TEXT DEFAULT 'maintain'");
    await addColumn('user_profiles', 'daily_calorie_target', 'INTEGER DEFAULT 2000');
    await addColumn('user_profiles', 'protein_target', 'INTEGER DEFAULT 150');
    await addColumn('user_profiles', 'carbs_target', 'INTEGER DEFAULT 200');
    await addColumn('user_profiles', 'fat_target', 'INTEGER DEFAULT 66');

    // New Scientific Mode columns (user_profiles)
    await addColumn('user_profiles', 'diet_mode', "TEXT DEFAULT 'normal'");
    await addColumn('user_profiles', 'neck', 'REAL DEFAULT 0');
    await addColumn('user_profiles', 'waist', 'REAL DEFAULT 0');
    await addColumn('user_profiles', 'hip', 'REAL DEFAULT 0');

    // Forum Posts fix
    await addColumn('forum_posts', 'image_url', 'TEXT');

    // DB Verification
    console.log('--- FINAL DB STATE ---');
    await verifyTable('user_profiles');
    await verifyTable('forum_posts');
}

migrate();
