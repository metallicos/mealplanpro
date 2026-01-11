
const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function createTable() {
    try {
        console.log('Creating ai_workout_logs table...');
        await client.execute(`
      CREATE TABLE IF NOT EXISTS ai_workout_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        model TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('Table ai_workout_logs created successfully.');
    } catch (error) {
        console.error('Error creating table:', error);
    }
}

createTable();
