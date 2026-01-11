const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@libsql/client');

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const dbUrl = process.env.TURSO_DATABASE_URL || 'file:local_v2.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

console.log(`Connecting to database: ${dbUrl}`);

const client = createClient({
    url: dbUrl,
    authToken: authToken,
});

const SOURCE_DIR = path.resolve(__dirname, '../../recipes_sources/es');

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.json')) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });

    return arrayOfFiles;
}

// Helper to parse numbers from strings like "12g", "405"
function parseNumber(str) {
    if (!str) return 0;
    const match = str.match(/[\d\.]+/);
    return match ? parseFloat(match[0]) : 0;
}

// Normalize strings for comparison
const normalize = (str) => str ? str.trim().toLowerCase() : '';

async function importRecipes() {
    try {
        const files = getAllFiles(SOURCE_DIR);
        console.log(`Found ${files.length} JSON files to process.`);

        let totalProcessed = 0;
        let totalImported = 0;
        let totalSkipped = 0;
        let totalUpdated = 0;

        for (const file of files) {
            console.log(`Processing ${file}...`);
            const content = fs.readFileSync(file, 'utf8');
            let recipes;

            try {
                recipes = JSON.parse(content);
            } catch (e) {
                console.error(`Error parsing JSON in ${file}:`, e.message);
                continue;
            }

            // Derive category/subcategory from path
            // e.g., .../es/healthy/7-day.json -> category=healthy, subcategory=7-day
            const relatives = path.relative(SOURCE_DIR, file).split(path.sep);
            const category = relatives.length > 1 ? relatives[0] : 'general';
            const subcategory = relatives.length > 1 ? path.basename(relatives[relatives.length - 1], '.json') : 'general';

            for (const recipe of recipes) {
                totalProcessed++;

                // 1. Try to find existing recipe by image_url
                const imageUrl = recipe.image_url;

                if (!imageUrl) {
                    console.warn(`Skipping recipe without image_url: ${recipe.title}`);
                    totalSkipped++;
                    continue;
                }

                // Check if exists
                const existing = await client.execute({
                    sql: "SELECT id FROM recipes WHERE image_url = ?",
                    args: [imageUrl]
                });

                let recipeId;

                if (existing.rows.length > 0) {
                    // Recipe exists, we will add translation
                    recipeId = existing.rows[0].id;
                    totalUpdated++;
                } else {
                    // Insert new recipe
                    // Map fields
                    const calories = parseNumber(recipe.nutritional_info?.kcal);
                    const protein = parseNumber(recipe.nutritional_info?.protein);
                    const carbs = parseNumber(recipe.nutritional_info?.carbs);
                    const fat = parseNumber(recipe.nutritional_info?.fat);
                    const prepTime = recipe.prep_time || '';
                    const cookTime = recipe.cook_time || '';
                    const serves = parseNumber(recipe.serves) || 1;

                    const isHealthy = category === 'healthy' ? 1 : 0;

                    const insertResult = await client.execute({
                        sql: `INSERT INTO recipes (
                            image_url, local_image_path, prep_time, cook_time, serves, 
                            calories, protein, carbs, fat, 
                            is_healthy, category, subcategory, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) RETURNING id`,
                        args: [
                            imageUrl,
                            recipe.local_image_path || null,
                            prepTime,
                            cookTime,
                            serves,
                            calories,
                            protein,
                            carbs,
                            fat,
                            isHealthy,
                            category,
                            subcategory
                        ]
                    });

                    recipeId = insertResult.rows[0].id;
                    totalImported++;
                }

                // 2. Insert/Update Translation (Spanish)
                const languageCode = 'es';

                // Check if translation exists
                const existingTrans = await client.execute({
                    sql: "SELECT id FROM recipe_translations WHERE recipe_id = ? AND language_code = ?",
                    args: [recipeId, languageCode]
                });

                const ingredientsJson = JSON.stringify(recipe.ingredients || []);
                const methodJson = JSON.stringify(recipe.method || []);

                if (existingTrans.rows.length > 0) {
                    // Update existing translation
                    await client.execute({
                        sql: `UPDATE recipe_translations SET 
                            title = ?, description = ?, ingredients_json = ?, method_json = ? 
                            WHERE id = ?`,
                        args: [
                            recipe.title,
                            recipe.description || '',
                            ingredientsJson,
                            methodJson,
                            existingTrans.rows[0].id
                        ]
                    });
                } else {
                    // Insert new translation
                    await client.execute({
                        sql: `INSERT INTO recipe_translations (
                            recipe_id, language_code, title, description, ingredients_json, method_json, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                        args: [
                            recipeId,
                            languageCode,
                            recipe.title,
                            recipe.description || '',
                            ingredientsJson,
                            methodJson
                        ]
                    });
                }
            }
        }

        console.log('-----------------------------------');
        console.log(`Import Completed.`);
        console.log(`Total Processed: ${totalProcessed}`);
        console.log(`New Recipes Created: ${totalImported}`);
        console.log(`Existing Recipes Updated (Translation added/updated): ${totalUpdated}`);
        console.log(`Skipped: ${totalSkipped}`);

    } catch (e) {
        console.error('Import failed:', e);
    }
}

importRecipes();
