const { createClient } = require('@libsql/client');
require('dotenv').config();

// Common food ingredients with macros per 100g
// Source: Standard USDA values (approximate)
const ingredients = [
    { name: 'Chicken Breast (Raw)', calories: 110, protein: 23.1, carbs: 0, fat: 1.2, category: 'meat' },
    { name: 'Chicken Breast (Cooked)', calories: 165, protein: 31, carbs: 0, fat: 3.6, category: 'meat' },
    { name: 'Ground Beef (90% Lean)', calories: 176, protein: 20, carbs: 0, fat: 10, category: 'meat' },
    { name: 'Salmon (Raw)', calories: 208, protein: 20, carbs: 0, fat: 13, category: 'meat' },
    { name: 'Tuna (Canned in Water)', calories: 116, protein: 26, carbs: 0, fat: 1, category: 'meat' },
    { name: 'Egg (Large, Whole)', calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5, category: 'dairy' },
    { name: 'Egg Whites', calories: 52, protein: 11, carbs: 0.7, fat: 0.2, category: 'dairy' },
    { name: 'Greek Yogurt (0% Fat)', calories: 59, protein: 10, carbs: 3.6, fat: 0.4, category: 'dairy' },
    { name: 'Cottage Cheese (Low Fat)', calories: 72, protein: 12, carbs: 3, fat: 1, category: 'dairy' },
    { name: 'Milk (Semi-Skimmed)', calories: 47, protein: 3.4, carbs: 4.8, fat: 1.7, category: 'dairy' },
    { name: 'White Rice (Raw)', calories: 360, protein: 7, carbs: 79, fat: 0.6, category: 'grain' },
    { name: 'White Rice (Cooked)', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, category: 'grain' },
    { name: 'Brown Rice (Raw)', calories: 360, protein: 7.5, carbs: 76, fat: 3.2, category: 'grain' },
    { name: 'Oats (Rolled)', calories: 389, protein: 16.9, carbs: 66, fat: 6.9, category: 'grain' },
    { name: 'Pasta (Raw)', calories: 371, protein: 13, carbs: 75, fat: 1.5, category: 'grain' },
    { name: 'Quinoa (Raw)', calories: 368, protein: 14, carbs: 64, fat: 6, category: 'grain' },
    { name: 'Sweet Potato (Raw)', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, category: 'vegetable' },
    { name: 'Potato (Raw)', calories: 77, protein: 2, carbs: 17, fat: 0.1, category: 'vegetable' },
    { name: 'Broccoli (Raw)', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, category: 'vegetable' },
    { name: 'Spinach (Raw)', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, category: 'vegetable' },
    { name: 'Carrots (Raw)', calories: 41, protein: 0.9, carbs: 10, fat: 0.2, category: 'vegetable' },
    { name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, category: 'fruit' },
    { name: 'Apple', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, category: 'fruit' },
    { name: 'Orange', calories: 47, protein: 0.9, carbs: 12, fat: 0.1, category: 'fruit' },
    { name: 'Blueberries', calories: 57, protein: 0.7, carbs: 14, fat: 0.3, category: 'fruit' },
    { name: 'Strawberries', calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, category: 'fruit' },
    { name: 'Almonds', calories: 579, protein: 21, carbs: 22, fat: 50, category: 'other' },
    { name: 'Peanut Butter', calories: 588, protein: 25, carbs: 20, fat: 50, category: 'other' },
    { name: 'Olive Oil', calories: 884, protein: 0, carbs: 0, fat: 100, category: 'other' },
    { name: 'Avocado', calories: 160, protein: 2, carbs: 9, fat: 15, category: 'fruit' },
    { name: 'Protein Powder (Whey)', calories: 370, protein: 80, carbs: 4, fat: 3, category: 'other' },
];

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
