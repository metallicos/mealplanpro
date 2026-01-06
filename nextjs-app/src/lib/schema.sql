USE meal_plan_app;

-- Disable foreign key checks for clean drop
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS weight_logs;
DROP TABLE IF EXISTS grocery_items;
DROP TABLE IF EXISTS grocery_budgets;
DROP TABLE IF EXISTS user_profiles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS households;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Create Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role ENUM('admin', 'master', 'member') NOT NULL,
    household_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Households Table
CREATE TABLE households (
    id INT AUTO_INCREMENT PRIMARY KEY,
    master_user_id INT NOT NULL,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (master_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Add FK to Users
ALTER TABLE users ADD CONSTRAINT fk_user_household FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE SET NULL;

-- 4. Create User Profiles (Linked to User ID)
CREATE TABLE user_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    weight DECIMAL(5,2),
    height INT,
    age INT,
    gender ENUM('male', 'female'),
    activity_level VARCHAR(30),
    goal VARCHAR(30),
    daily_calorie_target INT,
    protein_target INT,
    carbs_target INT,
    fat_target INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Create Grocery Budgets (Linked to Household ID)
CREATE TABLE grocery_budgets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    household_id INT NOT NULL,
    month VARCHAR(7) NOT NULL,
    initial_budget DECIMAL(10,2) DEFAULT 3000.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_household_month (household_id, month),
    FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

-- 6. Create Grocery Items (Linked to Budget)
CREATE TABLE grocery_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    budget_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    default_unit VARCHAR(20) NOT NULL,
    estimated_price_per_unit DECIMAL(10,2) NOT NULL,
    quantity INT DEFAULT 1,
    is_purchased BOOLEAN DEFAULT FALSE,
    is_out_of_stock BOOLEAN DEFAULT FALSE,
    buy_next_month BOOLEAN DEFAULT FALSE,
    comment TEXT,
    actual_price DECIMAL(10,2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (budget_id) REFERENCES grocery_budgets(id) ON DELETE CASCADE
);

-- 7. Create Weight Logs (Linked to User ID)
CREATE TABLE weight_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    week_date DATE NOT NULL,
    weight DECIMAL(5,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_week (user_id, week_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Seed Admin Account
INSERT INTO users (email, password_hash, full_name, role) 
VALUES ('admin@mealplan.com', '$2b$10$lBZBhAWKzwF6G0HiYv2vpuE90PeNxWNoD7L0r4WZTzkknB2xPKsYq', 'System Admin', 'admin');

-- 9. Seed Master Account (Demo)
INSERT INTO users (email, password_hash, full_name, role)
VALUES ('master@mealplan.com', '$2b$10$lBZBhAWKzwF6G0HiYv2vpuE90PeNxWNoD7L0r4WZTzkknB2xPKsYq', 'John (Master)', 'master');

-- Create Household for Master
INSERT INTO households (master_user_id, name) VALUES (LAST_INSERT_ID(), 'The Johnsons');
UPDATE users SET household_id = LAST_INSERT_ID() WHERE email = 'master@mealplan.com';

SELECT * FROM users;
