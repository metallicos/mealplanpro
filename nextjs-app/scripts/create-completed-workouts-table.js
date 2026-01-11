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
        console.log('Creating completed_workouts table...');

        await client.execute(`
      CREATE TABLE IF NOT EXISTS completed_workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        workout_json TEXT NOT NULL,
        feedback_json TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        console.log('Table completed_workouts created successfully!');

        // Verify
        const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='completed_workouts'");
        console.log('Verification:', tables.rows);

    } catch (error) {
        console.error('Error creating table:', error);
    }
}

main();
