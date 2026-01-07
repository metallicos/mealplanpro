#!/usr/bin/env node
/**
 * Import recipes from JSON files into Turso database.
 * 
 * Usage: 
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node scripts/import-recipes.js
 * 
 * Or with .env file:
 *   node scripts/import-recipes.js
 */

require('dotenv').config();
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const RECIPES_ROOT = path.join(__dirname, '..', '..', 'recipes_sources');
const CATEGORIES = ['healthy', 'cuisine', 'cakes-baking', 'ramadan'];
const BATCH_SIZE = 100; // Insert in batches for better performance

// Parse nutritional value (remove 'g' suffix and convert to number)
function parseNutrition(value) {
    if (!value) return 0;
    return parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
}

async function main() {
    // Connect to Turso
    const client = createClient({
        url: process.env.TURSO_DATABASE_URL || 'file:local.db',
        authToken: process.env.TURSO_AUTH_TOKEN,
    });

    console.log('🔌 Connected to Turso database\n');

    // Create recipes table if not exists
    // Create recipes table if not exists
    await client.execute(`
        CREATE TABLE IF NOT EXISTS recipes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            url TEXT,
            prep_time TEXT,
            cook_time TEXT,
            serves TEXT,
            kcal INTEGER DEFAULT 0,
            protein REAL DEFAULT 0,
            carbs REAL DEFAULT 0,
            fat REAL DEFAULT 0,
            fibre REAL DEFAULT 0,
            sugars REAL DEFAULT 0,
            salt REAL DEFAULT 0,
            saturates REAL DEFAULT 0,
            ingredients TEXT,
            method TEXT,
            image_url TEXT,
            local_image_path TEXT,
            category TEXT NOT NULL,
            subcategory TEXT,
            is_healthy BOOLEAN DEFAULT 0,
            tags TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create indexes
    await client.execute('CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category)');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_recipes_is_healthy ON recipes(is_healthy)');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes(title)');

    // Clear existing recipes
    console.log('🗑️  Clearing existing recipes...');
    await client.execute('DELETE FROM recipes');

    let totalImported = 0;
    let allRecipes = [];

    // Process each category folder
    for (const category of CATEGORIES) {
        const categoryPath = path.join(RECIPES_ROOT, category);

        if (!fs.existsSync(categoryPath)) {
            console.log(`⚠️  Skipping ${category} - folder not found`);
            continue;
        }

        const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.json'));
        console.log(`\n📂 Processing ${category}: ${files.length} files`);

        for (const file of files) {
            const subcategory = file.replace('.json', '');
            const filePath = path.join(categoryPath, file);

            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const recipes = JSON.parse(content);
                const recipeArray = Array.isArray(recipes) ? recipes : (recipes.meals || []);

                for (const recipe of recipeArray) {
                    const nutritionalInfo = recipe.nutritional_info || {};

                    allRecipes.push({
                        title: recipe.title || recipe.strMeal || recipe.name || 'Untitled',
                        description: recipe.description || '',
                        url: recipe.url || recipe.strSource || '',
                        prep_time: recipe.prep_time || '',
                        cook_time: recipe.cook_time || '',
                        serves: recipe.serves || '',
                        kcal: parseNutrition(nutritionalInfo.kcal),
                        protein: parseNutrition(nutritionalInfo.protein),
                        carbs: parseNutrition(nutritionalInfo.carbs),
                        fat: parseNutrition(nutritionalInfo.fat),
                        fibre: parseNutrition(nutritionalInfo.fibre),
                        sugars: parseNutrition(nutritionalInfo.sugars),
                        salt: parseNutrition(nutritionalInfo.salt),
                        saturates: parseNutrition(nutritionalInfo.saturates),
                        ingredients: JSON.stringify(recipe.ingredients || []),
                        method: JSON.stringify(recipe.method || recipe.instructions || []),
                        image_url: recipe.image_url || recipe.strMealThumb || '',
                        local_image_path: recipe.local_image_path || '',
                        category: category,
                        subcategory: subcategory,
                        is_healthy: category === 'healthy' ? 1 : 0,
                        tags: JSON.stringify(recipe.tags || [])
                    });
                }

                console.log(`   ✓ ${file}: ${recipeArray.length} recipes`);
            } catch (err) {
                console.error(`   ✗ ${file}: ${err.message}`);
            }
        }
    }

    // Also process main recipes.json if it exists
    const mainRecipesPath = path.join(RECIPES_ROOT, 'recipes.json');
    if (fs.existsSync(mainRecipesPath)) {
        console.log('\n📂 Processing main recipes.json...');
        try {
            const content = fs.readFileSync(mainRecipesPath, 'utf8');
            const data = JSON.parse(content);
            const recipes = data.meals || [];

            for (const recipe of recipes) {
                allRecipes.push({
                    title: recipe.strMeal || 'Untitled',
                    description: `Traditional ${recipe.strArea || ''} ${recipe.strCategory || ''} dish`,
                    url: recipe.strSource || '',
                    prep_time: '',
                    cook_time: '',
                    serves: '',
                    kcal: 0,
                    protein: 0,
                    carbs: 0,
                    fat: 0,
                    fibre: 0,
                    sugars: 0,
                    salt: 0,
                    saturates: 0,
                    ingredients: JSON.stringify(extractIngredients(recipe)),
                    method: JSON.stringify(extractInstructions(recipe.strInstructions)),
                    image_url: recipe.strMealThumb || '',
                    local_image_path: '',
                    category: 'international',
                    subcategory: recipe.strArea?.toLowerCase() || 'other',
                    is_healthy: 0,
                    tags: JSON.stringify([recipe.strCategory, recipe.strArea].filter(Boolean))
                });
            }
            console.log(`   ✓ recipes.json: ${recipes.length} recipes`);
        } catch (err) {
            console.error(`   ✗ recipes.json: ${err.message}`);
        }
    }

    // Insert in batches
    console.log(`\n📥 Inserting ${allRecipes.length} recipes into database...`);

    for (let i = 0; i < allRecipes.length; i += BATCH_SIZE) {
        const batch = allRecipes.slice(i, i + BATCH_SIZE);

        const sql = `
            INSERT INTO recipes (
                title, description, url, prep_time, cook_time, serves,
                kcal, protein, carbs, fat, fibre, sugars, salt, saturates,
                ingredients, method, image_url, local_image_path,
                category, subcategory, is_healthy, tags
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        for (const r of batch) {
            await client.execute({
                sql,
                args: [
                    r.title, r.description, r.url, r.prep_time, r.cook_time, r.serves,
                    r.kcal, r.protein, r.carbs, r.fat, r.fibre, r.sugars, r.salt, r.saturates,
                    r.ingredients, r.method, r.image_url, r.local_image_path,
                    r.category, r.subcategory, r.is_healthy, r.tags
                ]
            });
            totalImported++;
        }

        const progress = Math.min(i + BATCH_SIZE, allRecipes.length);
        process.stdout.write(`\r   Progress: ${progress}/${allRecipes.length} (${Math.round(progress / allRecipes.length * 100)}%)`);
    }

    console.log('\n\n✅ Import complete!');
    console.log(`   Total recipes imported: ${totalImported}`);

    // Show stats
    const stats = await client.execute(`
        SELECT category, COUNT(*) as count FROM recipes GROUP BY category
    `);
    console.log('\n📊 Recipes by category:');
    for (const row of stats.rows) {
        console.log(`   ${row.category}: ${row.count}`);
    }

    client.close();
}

// Helper to extract ingredients from TheMealDB format
function extractIngredients(recipe) {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
        const ingredient = recipe[`strIngredient${i}`];
        const measure = recipe[`strMeasure${i}`];
        if (ingredient && ingredient.trim()) {
            const combined = measure && measure.trim()
                ? `${measure.trim()} ${ingredient.trim()}`
                : ingredient.trim();
            ingredients.push(combined);
        }
    }
    return ingredients;
}

// Helper to split instructions into steps
function extractInstructions(instructions) {
    if (!instructions) return [];
    return instructions
        .split(/\r\n\r\n|\n\n/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
}

main().catch(err => {
    console.error('❌ Import failed:', err);
    process.exit(1);
});
