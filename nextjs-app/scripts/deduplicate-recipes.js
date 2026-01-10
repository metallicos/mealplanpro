#!/usr/bin/env node
/**
 * Remove duplicate recipes from Turso, keeping the one with best nutrition data
 */

const { createClient } = require('@libsql/client');

const TURSO_URL = 'libsql://mealplan-metallicos.aws-eu-west-1.turso.io';
const TURSO_TOKEN = process.argv[2];

async function deduplicate() {
    console.log('🧹 DEDUPLICATING RECIPES IN TURSO');
    console.log('📡 Connecting to:', TURSO_URL);

    const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

    // Step 1: Count before
    const beforeCount = await client.execute('SELECT COUNT(*) as c FROM recipes');
    console.log(`\n📊 Before: ${beforeCount.rows[0].c} recipes`);

    // Step 2: Find duplicates - keep the one with highest calories (has nutrition data)
    console.log('\n🔍 Finding duplicates by title...');

    // Get all recipe IDs grouped by title, keeping the one with max calories
    const duplicates = await client.execute(`
        SELECT rt.title, r.id, r.calories,
               ROW_NUMBER() OVER (
                   PARTITION BY LOWER(TRIM(rt.title)) 
                   ORDER BY r.calories DESC, r.id ASC
               ) as rn
        FROM recipes r
        JOIN recipe_translations rt ON r.id = rt.recipe_id AND rt.language_code = 'en'
    `);

    // Find IDs to delete (where rn > 1, meaning they are duplicates)
    const idsToDelete = duplicates.rows
        .filter(row => row.rn > 1)
        .map(row => row.id);

    console.log(`   Found ${idsToDelete.length} duplicate entries to remove`);

    // Step 3: Delete duplicates in batches
    if (idsToDelete.length > 0) {
        console.log('\n🗑️  Removing duplicates...');
        const batchSize = 100;
        for (let i = 0; i < idsToDelete.length; i += batchSize) {
            const batch = idsToDelete.slice(i, i + batchSize);
            const placeholders = batch.map(() => '?').join(',');

            // Delete translations first
            await client.execute({
                sql: `DELETE FROM recipe_translations WHERE recipe_id IN (${placeholders})`,
                args: batch
            });

            // Delete recipes
            await client.execute({
                sql: `DELETE FROM recipes WHERE id IN (${placeholders})`,
                args: batch
            });

            if ((i + batchSize) % 500 === 0 || i + batchSize >= idsToDelete.length) {
                console.log(`   Progress: ${Math.min(i + batchSize, idsToDelete.length)}/${idsToDelete.length}`);
            }
        }
    }

    // Step 4: Verify
    const afterCount = await client.execute('SELECT COUNT(*) as c FROM recipes');
    const withCals = await client.execute('SELECT COUNT(*) as c FROM recipes WHERE calories > 0');

    console.log(`\n✨ DEDUPLICATION COMPLETE!`);
    console.log(`   📦 Before: ${beforeCount.rows[0].c} recipes`);
    console.log(`   📦 After: ${afterCount.rows[0].c} recipes`);
    console.log(`   📊 With nutrition: ${withCals.rows[0].c}`);
    console.log(`   🗑️  Removed: ${beforeCount.rows[0].c - afterCount.rows[0].c}`);
}

deduplicate().catch(console.error);
