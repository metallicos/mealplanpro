const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const TURSO_URL = process.env.TURSO_URL || 'libsql://mealplan-metallicos.aws-eu-west-1.turso.io';
const TURSO_TOKEN = process.env.TURSO_TOKEN || process.argv[2];

async function migrate() {
    console.log('🚀 Starting Turso migration...');
    console.log('📡 Connecting to:', TURSO_URL);

    const client = createClient({
        url: TURSO_URL,
        authToken: TURSO_TOKEN
    });

    try {
        // Read schema file
        const schemaPath = path.join(__dirname, '..', 'src', 'db', 'schema_v2.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');

        // Split by semicolon and filter empty statements
        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`📝 Found ${statements.length} SQL statements to execute`);

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            if (stmt.includes('CREATE TABLE')) {
                const tableName = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
                console.log(`  ✅ Creating table: ${tableName}`);
            }
            try {
                await client.execute(stmt);
            } catch (err) {
                // Ignore "table already exists" errors
                if (!err.message.includes('already exists')) {
                    console.error(`  ⚠️ Error: ${err.message}`);
                }
            }
        }

        console.log('\n✨ Migration completed successfully!');

        // Verify tables
        const result = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
        console.log('\n📊 Tables in Turso database:');
        result.rows.forEach(row => console.log(`  - ${row.name}`));

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

migrate();
