#!/usr/bin/env node
/**
 * Import recipes from JSON files into SQLite database (V2 Schema).
 * Using local_v2.db by default.
 */

require('dotenv').config();
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const RECIPES_ROOT = path.join(__dirname, '..', '..', 'recipes_sources');
const CATEGORIES = ['healthy', 'cuisine', 'cakes-baking', 'ramadan'];
const BATCH_SIZE = 50; // Smaller batch for dual inserts

// Parse nutritional value (remove 'g' suffix and convert to number)
function parseNutrition(value) {
    if (!value) return 0;
    return parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
}

async function main() {
    const dbUrl = process.env.DATABASE_URL || 'file:local_v2.db';
    console.log(`🔌 Connecting to database: ${dbUrl}\n`);

    // Connect to Turso/SQLite
    const client = createClient({
        url: dbUrl,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });

    // We assume schema_v2.sql has already created the tables.
    // If not, we should probably run the schema file, but let's assume it exists 
    // since the app is running (expecting V2).

    // Clear existing recipes (Cascades to translations)
    console.log('🗑️  Clearing existing recipes...');
    await client.execute('DELETE FROM recipes');
    // Also clear translations just in case cascade fails or manual cleanup needed
    await client.execute('DELETE FROM recipe_translations');

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
                        prep_time: parseNutrition(recipe.prep_time) || 0, // Store as minutes integer if possible
                        cook_time: parseNutrition(recipe.cook_time) || 0,
                        serves: parseNutrition(recipe.serves) || 4,

                        // Macros
                        calories: parseNutrition(nutritionalInfo.kcal),
                        protein: parseNutrition(nutritionalInfo.protein),
                        carbs: parseNutrition(nutritionalInfo.carbs),
                        fat: parseNutrition(nutritionalInfo.fat),

                        ingredients: recipe.ingredients || [],
                        method: recipe.method || recipe.instructions || [],
                        image_url: recipe.image_url || recipe.strMealThumb || '',
                        local_image_path: recipe.local_image_path || '',
                        category: category,
                        subcategory: subcategory,
                        is_healthy: category === 'healthy' ? 1 : 0
                    });
                }
            } catch (err) {
                console.error(`   ✗ ${file}: ${err.message}`);
            }
        }
    }

    // Deduplicate recipes based on title
    console.log(`\n🔍 Found ${allRecipes.length} total recipes. Deduplicating...`);
    const uniqueRecipes = new Map();
    for (const r of allRecipes) {
        if (!uniqueRecipes.has(r.title)) {
            uniqueRecipes.set(r.title, r);
        }
    }
    allRecipes = Array.from(uniqueRecipes.values());
    console.log(`🧩 Unique recipes to import: ${allRecipes.length}`);

    // Insert
    console.log(`\n📥 Inserting ${allRecipes.length} recipes into database...`);

    for (let i = 0; i < allRecipes.length; i++) {
        const r = allRecipes[i];

        try {
            // 1. Insert into recipes (Base)
            // Using 'calories' instead of 'kcal' per V2 schema
            const recipeResult = await client.execute({
                sql: `INSERT INTO recipes (
                    image_url, local_image_path, prep_time, cook_time, serves,
                    calories, protein, carbs, fat,
                    category, subcategory, is_healthy
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
                args: [
                    r.image_url, r.local_image_path, r.prep_time, r.cook_time, r.serves,
                    r.calories, r.protein, r.carbs, r.fat,
                    r.category, r.subcategory, r.is_healthy
                ]
            });

            const recipeId = recipeResult.rows[0].id; // libSQL returns id on insert result if RETURNING is used, or use lastInsertRowid

            // 2. Insert into recipe_translations (English default)
            await client.execute({
                sql: `INSERT INTO recipe_translations (
                    recipe_id, language_code, title, description, ingredients_json, method_json
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                args: [
                    recipeId,
                    'en',
                    r.title,
                    r.description,
                    JSON.stringify(r.ingredients),
                    JSON.stringify(r.method)
                ]
            });

            totalImported++;
            if (i % 50 === 0) {
                process.stdout.write(`\r   Progress: ${i}/${allRecipes.length}`);
            }

        } catch (err) {
            console.error(`\nFailed to insert ${r.title}: ${err.message}`);
        }
    }

    console.log('\n\n✅ Import complete!');
    console.log(`   Total recipes imported: ${totalImported}`);

    client.close();
}

main().catch(err => {
    console.error('❌ Import failed:', err);
    process.exit(1);
});
