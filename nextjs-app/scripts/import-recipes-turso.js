#!/usr/bin/env node
/**
 * Import recipes into TURSO (not local)
 */

const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const TURSO_URL = 'libsql://mealplan-metallicos.aws-eu-west-1.turso.io';
const TURSO_TOKEN = process.argv[2];

const RECIPES_ROOT = path.join(__dirname, '..', '..', 'recipes_sources');
const CATEGORIES = ['healthy', 'cuisine', 'cakes-baking', 'ramadan'];
const BATCH_SIZE = 25;

function parseTime(value, extractCook = false) {
    if (!value) return 0;
    const str = String(value);
    let targetPart = str;
    if (str.toLowerCase().includes('cook:')) {
        const parts = str.split(/Cook:/i);
        if (extractCook && parts[1]) {
            targetPart = parts[1].trim();
        } else {
            targetPart = parts[0].trim();
        }
    }
    let totalMinutes = 0;
    const hourMatch = targetPart.match(/(\d+)\s*(?:hr|hour|h)/i);
    if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
    const minMatch = targetPart.match(/(\d+)\s*(?:min|m\b)/i);
    if (minMatch) totalMinutes += parseInt(minMatch[1]);
    if (totalMinutes === 0) {
        const numMatch = targetPart.match(/(\d+)/);
        if (numMatch) totalMinutes = parseInt(numMatch[1]);
    }
    return totalMinutes;
}

function parseNutrition(value) {
    if (!value) return 0;
    return parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
}

async function main() {
    console.log('🚀 IMPORTING RECIPES TO TURSO');
    console.log('📡 Connecting to:', TURSO_URL);

    const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

    // Clear existing
    console.log('\n🗑️  Clearing existing recipes...');
    await client.execute('DELETE FROM recipe_translations');
    await client.execute('DELETE FROM recipes');

    // Collect all recipes
    let allRecipes = [];
    for (const category of CATEGORIES) {
        const catPath = path.join(RECIPES_ROOT, category);
        if (!fs.existsSync(catPath)) continue;

        const files = fs.readdirSync(catPath).filter(f => f.endsWith('.json'));
        console.log(`📂 ${category}: ${files.length} files`);

        for (const file of files) {
            try {
                const data = JSON.parse(fs.readFileSync(path.join(catPath, file), 'utf-8'));
                const recipes = Array.isArray(data) ? data : (data.recipes || [data]);
                for (const r of recipes) {
                    const title = r.title || r.name;
                    if (!title) continue;

                    allRecipes.push({
                        title: title.trim(),
                        description: r.description || '',
                        image_url: r.imageUrl || r.image_url || r.image || '',
                        local_image_path: r.localImagePath || r.local_image_path || '',
                        prep_time: parseTime(r.prep_time || r.prepTime),
                        cook_time: parseTime(r.cook_time || r.cookTime) || parseTime(r.prep_time, true),
                        serves: parseInt(r.serves) || 4,
                        calories: parseNutrition(r.calories),
                        protein: parseNutrition(r.protein),
                        carbs: parseNutrition(r.carbs),
                        fat: parseNutrition(r.fat),
                        is_healthy: category === 'healthy' ? 1 : 0,
                        category: category,
                        subcategory: r.subcategory || file.replace('.json', ''),
                        ingredients_json: JSON.stringify(r.ingredients || []),
                        method_json: JSON.stringify(r.method || r.steps || [])
                    });
                }
            } catch (e) { }
        }
    }

    // Deduplicate
    const seen = new Set();
    const unique = allRecipes.filter(r => {
        const key = r.title.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    console.log(`\n📦 Unique recipes: ${unique.length}`);

    // Insert in batches
    console.log(`\n📥 Inserting recipes...`);
    for (let i = 0; i < unique.length; i += BATCH_SIZE) {
        const batch = unique.slice(i, i + BATCH_SIZE);

        for (const r of batch) {
            try {
                // Insert recipe
                const result = await client.execute({
                    sql: `INSERT INTO recipes (image_url, local_image_path, prep_time, cook_time, serves, calories, protein, carbs, fat, is_healthy, category, subcategory)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    args: [r.image_url, r.local_image_path, r.prep_time, r.cook_time, r.serves, r.calories, r.protein, r.carbs, r.fat, r.is_healthy, r.category, r.subcategory]
                });

                const recipeId = Number(result.lastInsertRowid);

                // Insert English translation
                await client.execute({
                    sql: `INSERT INTO recipe_translations (recipe_id, language_code, title, description, ingredients_json, method_json)
                          VALUES (?, 'en', ?, ?, ?, ?)`,
                    args: [recipeId, r.title, r.description, r.ingredients_json, r.method_json]
                });
            } catch (e) { }
        }

        if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= unique.length) {
            console.log(`   Progress: ${Math.min(i + BATCH_SIZE, unique.length)}/${unique.length}`);
        }
    }

    // Verify
    const count = await client.execute('SELECT COUNT(*) as c FROM recipes');
    const transCount = await client.execute('SELECT COUNT(*) as c FROM recipe_translations');

    console.log(`\n✨ IMPORT COMPLETE!`);
    console.log(`   📦 Recipes: ${count.rows[0].c}`);
    console.log(`   🌍 Translations: ${transCount.rows[0].c}`);
}

main().catch(console.error);
