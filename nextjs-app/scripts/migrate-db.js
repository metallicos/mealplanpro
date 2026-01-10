const { createClient } = require('@libsql/client');
const path = require('path');
const dotenv = require('dotenv');

// Load .env explicitly to get correct TURSO_DATABASE_URL (likely local_v2.db)
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

console.log('Connecting to database:', url);

const client = createClient({
    url,
    authToken,
});

async function addColumn(colName, colType) {
    try {
        console.log(`Adding ${colName} column...`);
        await client.execute(`ALTER TABLE user_profiles ADD COLUMN ${colName} ${colType}`);
        console.log('Success.');
    } catch (e) {
        if (e.message.includes('duplicate column')) {
            console.log(`Column ${colName} already exists.`);
        } else {
            console.log(`Error adding ${colName}:`, e.message);
        }
    }
}

async function migrate() {
    // Legacy columns missing in v2
    await addColumn('weight', 'REAL DEFAULT 0');
    await addColumn('height', 'REAL DEFAULT 0');
    await addColumn('age', 'INTEGER DEFAULT 0');
    await addColumn('goal', "TEXT DEFAULT 'maintain'"); // Note: v2 has macros_goal, but app uses goal
    await addColumn('daily_calorie_target', 'INTEGER DEFAULT 2000');
    await addColumn('protein_target', 'INTEGER DEFAULT 150');
    await addColumn('carbs_target', 'INTEGER DEFAULT 200');
    await addColumn('fat_target', 'INTEGER DEFAULT 66');

    // New Scientific Mode columns
    await addColumn('diet_mode', "TEXT DEFAULT 'normal'");
    await addColumn('neck', 'REAL DEFAULT 0');
    await addColumn('waist', 'REAL DEFAULT 0');
    await addColumn('hip', 'REAL DEFAULT 0');
}

migrate();
