-- SQLite Schema for Turso/LibSQL

-- Disable foreign keys for clean drop
PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS weight_logs;
DROP TABLE IF EXISTS grocery_items;
DROP TABLE IF EXISTS grocery_budgets;
DROP TABLE IF EXISTS user_profiles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS households;
DROP TABLE IF EXISTS recipes;
DROP TABLE IF EXISTS ingredients;
DROP TABLE IF EXISTS meal_ratings;
DROP TABLE IF EXISTS forum_posts;
DROP TABLE IF EXISTS forum_comments;
DROP TABLE IF EXISTS forum_likes;

PRAGMA foreign_keys = ON;

-- 1. Create Users Table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL CHECK(role IN ('admin', 'master', 'member')),
    household_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE SET NULL
);

-- 2. Create Households Table
CREATE TABLE households (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    master_user_id INTEGER NOT NULL,
    name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (master_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Create User Profiles
CREATE TABLE user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    weight REAL,
    height INTEGER,
    age INTEGER,
    gender TEXT CHECK(gender IN ('male', 'female')),
    activity_level TEXT,
    goal TEXT,
    daily_calorie_target INTEGER,
    protein_target INTEGER,
    carbs_target INTEGER,
    fat_target INTEGER,
    avatar_url TEXT,
    facebook TEXT,
    instagram TEXT,
    twitter TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Create Grocery Budgets
CREATE TABLE grocery_budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER NOT NULL,
    month TEXT NOT NULL, -- Format YYYY-MM
    initial_budget REAL DEFAULT 3000.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(household_id, month),
    FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

-- 5. Create Grocery Items
CREATE TABLE grocery_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    budget_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    default_unit TEXT NOT NULL,
    estimated_price_per_unit REAL NOT NULL,
    quantity INTEGER DEFAULT 1,
    is_purchased BOOLEAN DEFAULT 0,
    is_out_of_stock BOOLEAN DEFAULT 0,
    buy_next_month BOOLEAN DEFAULT 0,
    comment TEXT,
    actual_price REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (budget_id) REFERENCES grocery_budgets(id) ON DELETE CASCADE
);

-- 6. Create Weight Logs
CREATE TABLE weight_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    week_date TEXT NOT NULL, -- Format YYYY-MM-DD
    weight REAL NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, week_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Create Recipes Table (NEW)
CREATE TABLE recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT,
    prep_time TEXT,
    cook_time TEXT,
    serves TEXT,
    -- Nutritional info (per serving)
    kcal INTEGER DEFAULT 0,
    protein REAL DEFAULT 0,
    carbs REAL DEFAULT 0,
    fat REAL DEFAULT 0,
    fibre REAL DEFAULT 0,
    sugars REAL DEFAULT 0,
    salt REAL DEFAULT 0,
    saturates REAL DEFAULT 0,
    -- Ingredients and method stored as JSON arrays
    ingredients TEXT, -- JSON array
    method TEXT, -- JSON array
    -- Images
    image_url TEXT,
    local_image_path TEXT,
    -- Category info
    category TEXT NOT NULL, -- 'healthy', 'cuisine', 'cakes-baking', 'ramadan', 'international'
    subcategory TEXT,
    is_healthy BOOLEAN DEFAULT 0,
    tags TEXT, -- JSON array
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipes_is_healthy ON recipes(is_healthy);
CREATE INDEX idx_recipes_title ON recipes(title);

-- 8. Create Ingredients Table (NEW)
CREATE TABLE ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    calories INTEGER NOT NULL, -- per 100g
    protein REAL NOT NULL,    -- per 100g
    carbs REAL NOT NULL,      -- per 100g
    fat REAL NOT NULL,        -- per 100g
    fiber REAL DEFAULT 0,     -- per 100g
    sugar REAL DEFAULT 0,     -- per 100g
    category TEXT, -- 'meat', 'vegetable', 'fruit', 'grain', 'dairy', 'other'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Create Meal Ratings Table (NEW)
CREATE TABLE meal_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    meal_id INTEGER NOT NULL,
    rating INTEGER CHECK(rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (meal_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- 10. Create Forum Posts Table (NEW)
CREATE TABLE forum_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT, -- Added for image posts
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 11. Create Forum Comments Table (NEW)
CREATE TABLE forum_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT, -- Added for image in comments
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 12. Create Forum Likes Table (NEW)
CREATE TABLE forum_likes (
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE
);

-- 13. Create Daily Logs Table (NEW)
CREATE TABLE daily_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL, -- Format YYYY-MM-DD
    food_name TEXT NOT NULL,
    grams INTEGER NOT NULL,
    calories INTEGER NOT NULL,
    protein REAL DEFAULT 0,
    carbs REAL DEFAULT 0,
    fat REAL DEFAULT 0,
    meal_type TEXT NOT NULL, -- 'breakfast', 'lunch', 'dinner', 'snack'
    minerals TEXT, -- JSON object for minerals
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 13. Seed Admin Account
INSERT INTO users (email, password_hash, full_name, role) 
VALUES ('admin@mealplan.com', '$2b$10$lBZBhAWKzwF6G0HiYv2vpuE90PeNxWNoD7L0r4WZTzkknB2xPKsYq', 'System Admin', 'admin');

-- 14. Seed Master Account
INSERT INTO users (email, password_hash, full_name, role)
VALUES ('master@mealplan.com', '$2b$10$lBZBhAWKzwF6G0HiYv2vpuE90PeNxWNoD7L0r4WZTzkknB2xPKsYq', 'John (Master)', 'master');

-- Create Household for Master (SQLite doesn't support LAST_INSERT_ID() directly in values like MySQL)
-- We use subquery to get the ID
INSERT INTO households (master_user_id, name) 
VALUES ((SELECT id FROM users WHERE email = 'master@mealplan.com'), 'The Johnsons');

UPDATE users 
SET household_id = (SELECT id FROM households WHERE name = 'The Johnsons') 
WHERE email = 'master@mealplan.com';
