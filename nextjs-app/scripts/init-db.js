const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config(); // Fallback to .env

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
    console.error('❌ Error: TURSO_DATABASE_URL environment variable is missing.');
    console.log('   Please create a .env.local file with your Turso credentials.');
    process.exit(1);
}

const client = createClient({
    url,
    authToken,
});

async function init() {
    console.log('🚀 Initializing database...');
    console.log(`📍 Connecting to: ${url}`);

    try {
        const schemaPath = path.join(__dirname, '..', 'src', 'lib', 'schema_sqlite.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Split by semicolon but ignore semicolons in comments/strings if possible
        // For simple schema, splitting by semicolon is usually fine unless triggers/functions are used
        // Our schema is simple enough.
        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const rawStatement of statements) {
            // Remove comments (lines starting with --)
            const statement = rawStatement
                .split('\n')
                .filter(line => !line.trim().startsWith('--'))
                .join('\n')
                .trim();

            // Skip empty statements
            if (statement.length === 0) continue;

            console.log(`   Executing: ${statement.substring(0, 50).replace(/\n/g, ' ')}...`);
            await client.execute(statement);
        }

        console.log('✅ Database initialized successfully!');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

init();
