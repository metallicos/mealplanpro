const { createClient } = require('@libsql/client');
require('dotenv').config();

// Common fo// Import ingredients from external JSON file
const ingredients = require('./ingredients_data.json');

async function main() {
    const client = createClient({
        url: process.env.TURSO_DATABASE_URL || 'file:local.db',
        authToken: process.env.TURSO_AUTH_TOKEN,
    });

    console.log('🔌 Connected to Turso');

    // Create table if not exists (in case schema update wasn't run)
    await client.execute(`
        CREATE TABLE IF NOT EXISTS ingredients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            calories INTEGER NOT NULL,
            protein REAL NOT NULL,
            carbs REAL NOT NULL,
            fat REAL NOT NULL,
            fiber REAL DEFAULT 0,
            sugar REAL DEFAULT 0,
            category TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log('🗑️  Clearing ingredients table...');
    await client.execute('DELETE FROM ingredients');

    console.log(`🌱 Seeding ${ingredients.length} ingredients...`);

    for (const item of ingredients) {
        await client.execute({
            sql: `INSERT INTO ingredients (name, calories, protein, carbs, fat, category) 
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [item.name, item.calories, item.protein, item.carbs, item.fat, item.category]
        });
    }

    console.log('✅ Ingredients seeded successfully!');
    client.close();
}

main().catch(err => {
    console.error('❌ Failed to seed ingredients:', err);
    process.exit(1);
});
