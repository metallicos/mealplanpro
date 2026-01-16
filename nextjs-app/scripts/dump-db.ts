/**
 * Database Dump Script
 * Creates a backup of all tables in the Turso database
 */

import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';

const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function dumpDatabase() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dumpDir = path.join(process.cwd(), 'backups');
    const dumpFile = path.join(dumpDir, `db-backup-${timestamp}.json`);

    // Create backups directory if it doesn't exist
    if (!fs.existsSync(dumpDir)) {
        fs.mkdirSync(dumpDir, { recursive: true });
    }

    console.log('🔍 Fetching database tables...\n');

    // Get all tables
    const tablesResult = await client.execute({
        sql: "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream_%'",
        args: []
    });

    const tables = tablesResult.rows.map(row => row.name as string);
    console.log(`📋 Found ${tables.length} tables: ${tables.join(', ')}\n`);

    const backup: Record<string, any> = {
        metadata: {
            timestamp: new Date().toISOString(),
            database_url: url.includes('@') ? url.replace(/:[^:@]+@/, ':***@') : url,
            tables_count: tables.length
        },
        schema: {},
        data: {}
    };

    // Dump each table
    for (const table of tables) {
        console.log(`📦 Dumping table: ${table}`);

        // Get table schema
        const schemaResult = await client.execute({
            sql: `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`,
            args: [table]
        });
        backup.schema[table] = schemaResult.rows[0]?.sql || '';

        // Get all rows
        const dataResult = await client.execute({
            sql: `SELECT * FROM ${table}`,
            args: []
        });

        backup.data[table] = {
            count: dataResult.rows.length,
            rows: dataResult.rows
        };

        console.log(`   ✅ ${dataResult.rows.length} rows`);
    }

    // Write to file
    fs.writeFileSync(dumpFile, JSON.stringify(backup, null, 2));
    console.log(`\n✅ Backup saved to: ${dumpFile}`);

    // Also print summary to console
    console.log('\n📊 Database Summary:\n');
    console.log('='.repeat(50));
    for (const table of tables) {
        const count = backup.data[table].count;
        console.log(`  ${table.padEnd(25)} ${count} rows`);
    }
    console.log('='.repeat(50));

    return backup;
}

dumpDatabase().catch(console.error);
