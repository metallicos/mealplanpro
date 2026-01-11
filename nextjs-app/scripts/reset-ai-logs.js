
const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function resetLogs() {
    try {
        console.log('Resetting ai_workout_logs...');
        await client.execute("DELETE FROM ai_workout_logs");
        console.log('Logs cleared successfully.');
    } catch (error) {
        console.error('Error resetting logs:', error);
    }
}

resetLogs();
