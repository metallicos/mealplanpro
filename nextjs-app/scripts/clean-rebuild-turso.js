const { createClient } = require('@libsql/client');

const TURSO_URL = 'libsql://mealplan-metallicos.aws-eu-west-1.turso.io';
const TURSO_TOKEN = process.argv[2];

async function cleanAndRebuild() {
    console.log('🗑️  CLEANING AND REBUILDING TURSO DATABASE');
    console.log('📡 Connecting to:', TURSO_URL);

    const client = createClient({
        url: TURSO_URL,
        authToken: TURSO_TOKEN
    });

    try {
        // Step 1: Get and drop all existing tables
        console.log('\n📋 Step 1: Dropping all existing tables...');
        const result = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'");
        const tables = result.rows.map(r => r.name);

        for (const table of tables) {
            await client.execute(`DROP TABLE IF EXISTS "${table}"`);
            console.log(`   ✅ Dropped: ${table}`);
        }

        // Step 2: Create all V2 tables
        console.log('\n📝 Step 2: Creating V2 schema...');

        const createStatements = [
            // Users
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT CHECK(role IN ('admin', 'master', 'member')) DEFAULT 'member',
                household_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Households
            `CREATE TABLE IF NOT EXISTS households (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                master_user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (master_user_id) REFERENCES users(id)
            )`,

            // User Profiles
            `CREATE TABLE IF NOT EXISTS user_profiles (
                user_id INTEGER PRIMARY KEY,
                gender TEXT CHECK(gender IN ('male', 'female', 'other')),
                macros_goal TEXT,
                activity_level TEXT,
                dietary_restrictions TEXT,
                sleep_avg INTEGER,
                stress_level INTEGER,
                preferred_language TEXT DEFAULT 'en',
                preferred_currency TEXT DEFAULT 'USD',
                avatar_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,

            // Recipes
            `CREATE TABLE IF NOT EXISTS recipes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                image_url TEXT,
                local_image_path TEXT,
                prep_time INTEGER,
                cook_time INTEGER,
                serves INTEGER DEFAULT 4,
                calories INTEGER,
                protein INTEGER,
                carbs INTEGER,
                fat INTEGER,
                is_healthy BOOLEAN DEFAULT 0,
                category TEXT,
                subcategory TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Recipe Translations (V2)
            `CREATE TABLE IF NOT EXISTS recipe_translations (
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
            )`,

            // Water Logs
            `CREATE TABLE IF NOT EXISTS water_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date DATE NOT NULL,
                amount_ml INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,

            // Fasting Logs
            `CREATE TABLE IF NOT EXISTS fasting_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                start_time DATETIME NOT NULL,
                end_time DATETIME,
                goal_hours INTEGER DEFAULT 16,
                mood_at_end TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,

            // Weight Logs
            `CREATE TABLE IF NOT EXISTS weight_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                week_date DATE NOT NULL,
                weight REAL NOT NULL,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, week_date),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,

            // Daily Check-ins
            `CREATE TABLE IF NOT EXISTS daily_checkins (
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
            )`,

            // Daily Logs (food tracking)
            `CREATE TABLE IF NOT EXISTS daily_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date DATE NOT NULL,
                food_name TEXT NOT NULL,
                grams REAL,
                meal_type TEXT,
                calories REAL,
                protein REAL,
                carbs REAL,
                fat REAL,
                minerals TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,

            // Ingredients
            `CREATE TABLE IF NOT EXISTS ingredients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT,
                calories REAL,
                protein REAL,
                carbs REAL,
                fat REAL,
                minerals TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Grocery Budgets
            `CREATE TABLE IF NOT EXISTS grocery_budgets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                household_id INTEGER NOT NULL,
                month TEXT NOT NULL,
                initial_budget REAL DEFAULT 3000,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(household_id, month),
                FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
            )`,

            // Grocery Items
            `CREATE TABLE IF NOT EXISTS grocery_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                budget_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                category TEXT,
                default_unit TEXT,
                estimated_price_per_unit REAL,
                quantity REAL DEFAULT 1,
                is_purchased BOOLEAN DEFAULT 0,
                is_out_of_stock BOOLEAN DEFAULT 0,
                buy_next_month BOOLEAN DEFAULT 0,
                actual_price REAL,
                comment TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (budget_id) REFERENCES grocery_budgets(id) ON DELETE CASCADE
            )`,

            // Forum Posts
            `CREATE TABLE IF NOT EXISTS forum_posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                category TEXT DEFAULT 'general',
                likes_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,

            // Forum Comments
            `CREATE TABLE IF NOT EXISTS forum_comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,

            // Forum Likes
            `CREATE TABLE IF NOT EXISTS forum_likes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(post_id, user_id),
                FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,

            // Meal Ratings
            `CREATE TABLE IF NOT EXISTS meal_ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                meal_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(meal_id, user_id),
                FOREIGN KEY (meal_id) REFERENCES recipes(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`
        ];

        for (const stmt of createStatements) {
            const tableName = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
            try {
                await client.execute(stmt);
                console.log(`   ✅ Created: ${tableName}`);
            } catch (err) {
                console.log(`   ⚠️ Error creating ${tableName}: ${err.message}`);
            }
        }

        // Step 3: Create admin and demo users
        console.log('\n👤 Step 3: Creating users...');

        await client.execute(`
            INSERT INTO users (email, password_hash, full_name, role) 
            VALUES ('admin@mealplan.pro', 'admin123', 'Admin User', 'admin')
        `);
        console.log('   ✅ Admin: admin@mealplan.pro / admin123');

        await client.execute(`
            INSERT INTO users (email, password_hash, full_name, role) 
            VALUES ('demo@mealplan.pro', 'demo123', 'Abdellah Saaidi', 'master')
        `);

        await client.execute(`INSERT INTO households (master_user_id, name) VALUES (2, 'Saaidi Family')`);
        await client.execute(`UPDATE users SET household_id = 1 WHERE id = 2`);
        console.log('   ✅ Demo: demo@mealplan.pro / demo123');

        // Step 4: Verify
        console.log('\n📊 Step 4: Verifying...');
        const finalTables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
        console.log(`   Tables: ${finalTables.rows.length}`);
        finalTables.rows.forEach(row => console.log(`   - ${row.name}`));

        console.log('\n✨ DATABASE REBUILD COMPLETE!');
        console.log('\n📝 Next: Run recipe import script');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

cleanAndRebuild();
