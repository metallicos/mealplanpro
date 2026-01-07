const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const client = createClient({
    url: 'file:local.db',
});

async function main() {
    try {
        const schemaPath = path.join(__dirname, '../src/lib/schema_sqlite.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Split by semicolon? LibSQL client usually supports executeMultiple.
        // client.executeMultiple(schemaSql) is available in some versions.
        // If not, we split. schema_sqlite.sql has PRAGMAs and CREATEs.

        console.log('Initializing database from schema...');
        await client.executeMultiple(schemaSql);

        console.log('Database initialized successfully.');
    } catch (err) {
        console.error('Failed to init DB:', err);
        // Fallback to manual split if executeMultiple fails
        try {
            const schemaPath = path.join(__dirname, '../src/lib/schema_sqlite.sql');
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            const statements = schemaSql.split(';').map(s => s.trim()).filter(s => s.length > 0);
            for (const stmt of statements) {
                // Skip PRAGMA if it causes issues, mostly FK pragma is fine.
                if (stmt.toLowerCase().startsWith('pragma')) continue;
                await client.execute(stmt);
            }
            console.log('Database initialized via fallback split.');
        } catch (fallbackErr) {
            console.error('Fallback failed:', fallbackErr);
        }
    }
}

main();
