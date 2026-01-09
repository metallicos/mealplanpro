const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const dbPath = 'local_v2.db';
const schemaPath = path.join(__dirname, '../src/db/schema_v2.sql');

async function initDb() {
    console.log(`Initializing V2 Database: ${dbPath}`);

    // 1. Read Schema
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // 2. Connect
    const client = createClient({
        url: `file:${dbPath}`,
    });

    try {
        // 3. Split commands (SQLite doesn't always like running massive dumps in one go via drivers, 
        // but lets try executemultiple if supported, or split by semicolon)
        // Basic split by semicolon might fail on triggers, but our schema is simple.

        // LibSQL client often supports .executeMultiple is not standard in basic client? 
        // Actually standard client.execute handles one. 
        // Let's iterate.

        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            // Skip comments if strictly needed, but SQL engine usually handles them
            await client.execute(statement);
        }

        console.log(`✅ Successfully initialized ${dbPath} with ${statements.length} statements.`);

    } catch (err) {
        console.error('❌ Failed to initialize database:', err);
    }
}

initDb();
