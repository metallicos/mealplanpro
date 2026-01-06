-- SQLite Schema for Turso/LibSQL

-- Disable foreign keys for clean drop
PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS weight_logs;
DROP TABLE IF EXISTS grocery_items;
DROP TABLE IF EXISTS grocery_budgets;
DROP TABLE IF EXISTS user_profiles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS households;

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

-- 7. Seed Admin Account
INSERT INTO users (email, password_hash, full_name, role) 
VALUES ('admin@mealplan.com', '$2b$10$lBZBhAWKzwF6G0HiYv2vpuE90PeNxWNoD7L0r4WZTzkknB2xPKsYq', 'System Admin', 'admin');

-- 8. Seed Master Account
INSERT INTO users (email, password_hash, full_name, role)
VALUES ('master@mealplan.com', '$2b$10$lBZBhAWKzwF6G0HiYv2vpuE90PeNxWNoD7L0r4WZTzkknB2xPKsYq', 'John (Master)', 'master');

-- Create Household for Master (SQLite doesn't support LAST_INSERT_ID() directly in values like MySQL)
-- We use subquery to get the ID
INSERT INTO households (master_user_id, name) 
VALUES ((SELECT id FROM users WHERE email = 'master@mealplan.com'), 'The Johnsons');

UPDATE users 
SET household_id = (SELECT id FROM households WHERE name = 'The Johnsons') 
WHERE email = 'master@mealplan.com';
