require('dotenv').config();
const { createClient } = require('@libsql/client');
const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function main() {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
        console.error('❌ Missing Cloudinary credentials. Please set CLOUDINARY_CLOUD_NAME, API_KEY, and API_SECRET.');
        process.exit(1);
    }

    const client = createClient({
        url: process.env.TURSO_DATABASE_URL || 'file:local.db',
        authToken: process.env.TURSO_AUTH_TOKEN,
    });

    console.log('🔌 Connected to database');

    try {
        // Fetch recipes with local_image_path
        const result = await client.execute("SELECT id, title, local_image_path, image_url FROM recipes WHERE local_image_path IS NOT NULL AND local_image_path != ''");
        const recipes = result.rows;

        console.log(`🔍 Found ${recipes.length} recipes with local paths.`);

        let updated = 0;
        let skipped = 0;
        let failed = 0;

        for (const recipe of recipes) {
            // Skip if already Cloudinary
            if (recipe.image_url && recipe.image_url.includes('cloudinary.com')) {
                skipped++;
                continue;
            }

            let localPath = path.join(process.cwd(), 'public', recipe.local_image_path);

            if (!fs.existsSync(localPath)) {
                // Try alternate path: inject 'recipes' directory which exists on disk
                // Path in DB: images/healthy/...
                // Path on Disk: public/images/recipes/healthy/...
                const relative = recipe.local_image_path;
                if (relative.startsWith('images/')) {
                    const altPath = path.join(process.cwd(), 'public', 'images', 'recipes', relative.substring(7));
                    if (fs.existsSync(altPath)) {
                        localPath = altPath;
                    }
                }
            }

            if (!fs.existsSync(localPath)) {
                console.warn(`⚠️  File not found: ${localPath} (ID: ${recipe.id})`);
                failed++;
                continue;
            }

            try {
                // Upload
                const uploadResult = await cloudinary.uploader.upload(localPath, {
                    folder: 'mealplan_recipes',
                    public_id: `recipe_${recipe.id}_${path.basename(localPath, path.extname(localPath))}`,
                    overwrite: false
                });

                // Update DB
                await client.execute({
                    sql: "UPDATE recipes SET image_url = ? WHERE id = ?",
                    args: [uploadResult.secure_url, recipe.id]
                });

                updated++;
                process.stdout.write(`\r✅ Uploaded: ${updated} | Skipped: ${skipped} | Missing: ${failed}`);
            } catch (err) {
                console.error(`\n❌ Failed to upload ${localPath}: ${err.message}`);
                failed++;
            }
        }

        console.log('\n\n✨ Sync Complete!');
        console.log(`   Uploaded: ${updated}`);
        console.log(`   Skipped: ${skipped}`);
        console.log(`   Missing/Failed: ${failed}`);

    } catch (err) {
        console.error('Fatal Error:', err);
    } finally {
        client.close();
    }
}

main();
