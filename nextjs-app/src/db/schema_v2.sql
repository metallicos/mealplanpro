-- MealPlan Pro V2.0 Complete Schema (SQLite Compatible)

-- ==========================================
-- 1. AUTHENTICATION & USERS
-- ==========================================

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'master', 'member')) DEFAULT 'member',
    household_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS households (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    master_user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (master_user_id) REFERENCES users(id)
);

-- V2: Enhanced Profile with Preferences
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INTEGER PRIMARY KEY,
    gender TEXT CHECK(gender IN ('male', 'female', 'other')),
    macros_goal TEXT, -- JSON: {protein, carbs, fat, calories}
    activity_level TEXT,
    dietary_restrictions TEXT, -- JSON array
    sleep_avg INTEGER, -- minutes
    stress_level INTEGER, -- 1-10
    
    -- New V2 Fields
    preferred_language TEXT DEFAULT 'en', -- en, fr, es
    preferred_currency TEXT DEFAULT 'USD', -- USD, EUR, MAD
    avatar_url TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==========================================
-- 2. RECIPES & INTERNATIONALIZATION (V2)
-- ==========================================

CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Base metadata (Language Agnostic)
    image_url TEXT,
    local_image_path TEXT,
    prep_time INTEGER, -- minutes
    cook_time INTEGER, -- minutes
    serves INTEGER DEFAULT 4,
    calories INTEGER,
    protein INTEGER,
    carbs INTEGER,
    fat INTEGER,
    is_healthy BOOLEAN DEFAULT 0,
    category TEXT,
    subcategory TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- New V2: Recipe Translations
-- Instead of duplicating rows, we store text content here
CREATE TABLE IF NOT EXISTS recipe_translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    language_code TEXT NOT NULL, -- 'en', 'fr'
    
    title TEXT NOT NULL,
    description TEXT,
    ingredients_json TEXT, -- JSON array of objects {item, quantity, unit}
    method_json TEXT,      -- JSON array of strings
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(recipe_id, language_code),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- ==========================================
-- 3. HEALTH TRACKING (V2)
-- ==========================================

-- Water Tracking
CREATE TABLE IF NOT EXISTS water_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL, -- YYYY-MM-DD
    amount_ml INTEGER NOT NULL, -- Total accumulated for the day? Or individual entries? Let's do individual entries for granularity
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Fasting Tracker
CREATE TABLE IF NOT EXISTS fasting_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME, -- Null if currently fasting
    goal_hours INTEGER DEFAULT 16,
    mood_at_end TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Weight Logs (Existing + Cleaned)
CREATE TABLE IF NOT EXISTS weight_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    week_date DATE NOT NULL,
    weight REAL NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, week_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==========================================
-- 4. AI & PERSONALIZATION (V2)
-- ==========================================

-- Daily Check-in for AI Context
CREATE TABLE IF NOT EXISTS daily_checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    
    sleep_hours REAL,
    mood_score INTEGER, -- 1-10
    energy_level INTEGER, -- 1-10
    soreness_level INTEGER, -- 1-10
    
    notes TEXT, -- "Had a bad day at work", "Feeling great"
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==========================================
-- 5. GROCERIES (V1 Refined)
-- ==========================================

CREATE TABLE IF NOT EXISTS grocery_budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER NOT NULL,
    month TEXT NOT NULL, -- YYYY-MM
    initial_budget REAL DEFAULT 3000,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(household_id, month),
    FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS grocery_items (
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
);

-- ==========================================
-- 6. COMMUNITY & SOCIAL
-- ==========================================

CREATE TABLE IF NOT EXISTS forum_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    likes_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS forum_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS forum_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meal_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(meal_id, user_id),
    FOREIGN KEY (meal_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
