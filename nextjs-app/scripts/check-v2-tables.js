const { createClient } = require('@libsql/client');

const TURSO_URL = 'libsql://mealplan-metallicos.aws-eu-west-1.turso.io';
const TURSO_TOKEN = process.argv[2];

async function checkAndAddMissingTables() {
    console.log('🔍 Checking for missing V2 tables...');

    const client = createClient({
        url: TURSO_URL,
        authToken: TURSO_TOKEN
    });

    // Get existing tables
    const result = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    const existingTables = new Set(result.rows.map(r => r.name));
    console.log('📋 Existing tables:', [...existingTables].join(', '));

    // V2 required tables
    const v2Tables = {
        'recipe_translations': `
            CREATE TABLE IF NOT EXISTS recipe_translations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recipe_id INTEGER NOT NULL,
                language_code TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                ingredients_json TEXT,
                method_json TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(recipe_id, language_code),
                FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
            )
        `,
        'water_logs': `
            CREATE TABLE IF NOT EXISTS water_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date DATE NOT NULL,
                amount_ml INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `,
        'fasting_logs': `
            CREATE TABLE IF NOT EXISTS fasting_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                start_time DATETIME NOT NULL,
                end_time DATETIME,
                goal_hours INTEGER DEFAULT 16,
                mood_at_end TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `,
        'daily_checkins': `
            CREATE TABLE IF NOT EXISTS daily_checkins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date DATE NOT NULL,
                sleep_hours REAL,
                mood_score INTEGER,
                energy_level INTEGER,
                soreness_level INTEGER,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, date),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `
    };

    for (const [tableName, createSQL] of Object.entries(v2Tables)) {
        if (!existingTables.has(tableName)) {
            console.log(`  ➕ Creating missing table: ${tableName}`);
            try {
                await client.execute(createSQL);
                console.log(`  ✅ Created: ${tableName}`);
            } catch (err) {
                console.error(`  ❌ Failed to create ${tableName}:`, err.message);
            }
        } else {
            console.log(`  ✓ Table exists: ${tableName}`);
        }
    }

    // Verify final state
    const finalResult = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    console.log('\n📊 Final tables in Turso:');
    finalResult.rows.forEach(row => console.log(`  - ${row.name}`));
    console.log(`\n✨ Total tables: ${finalResult.rows.length}`);
}

checkAndAddMissingTables().catch(console.error);
