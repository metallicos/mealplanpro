-- Meal Planning Application Database Schema
-- For MariaDB in Laradock

CREATE DATABASE IF NOT EXISTS meal_plan_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE meal_plan_app;

-- Users table (for the couple)
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    weight_kg DECIMAL(5,2),
    height_cm INT,
    age INT,
    gender ENUM('male', 'female') NOT NULL,
    activity_level ENUM('sedentary', 'light', 'moderate', 'active', 'very_active') DEFAULT 'sedentary',
    daily_calorie_target INT,
    protein_target INT,
    carbs_target INT,
    fat_target INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Foods database with nutritional info per 100g
CREATE TABLE IF NOT EXISTS foods (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    category ENUM('protein', 'carbs', 'vegetables', 'fruits', 'fats', 'dairy', 'snacks', 'other') NOT NULL,
    calories_per_100g DECIMAL(6,2) NOT NULL,
    protein_per_100g DECIMAL(5,2) DEFAULT 0,
    carbs_per_100g DECIMAL(5,2) DEFAULT 0,
    fat_per_100g DECIMAL(5,2) DEFAULT 0,
    fiber_per_100g DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Meal plans (weekly templates)
CREATE TABLE IF NOT EXISTS meal_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    day_of_week TINYINT NOT NULL COMMENT '1=Monday, 7=Sunday',
    meal_type ENUM('main', 'snack') NOT NULL,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Meal plan items (foods in a meal plan)
CREATE TABLE IF NOT EXISTS meal_plan_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    meal_plan_id INT NOT NULL,
    food_id INT NOT NULL,
    grams DECIMAL(6,2) NOT NULL,
    FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE
);

-- Daily macro/calorie logs
CREATE TABLE IF NOT EXISTS daily_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    log_date DATE NOT NULL,
    total_calories DECIMAL(7,2) DEFAULT 0,
    total_protein DECIMAL(6,2) DEFAULT 0,
    total_carbs DECIMAL(6,2) DEFAULT 0,
    total_fat DECIMAL(6,2) DEFAULT 0,
    weight_kg DECIMAL(5,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, log_date)
);

-- Daily log items (individual food entries)
CREATE TABLE IF NOT EXISTS daily_log_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    daily_log_id INT NOT NULL,
    food_id INT NOT NULL,
    meal_type ENUM('main', 'snack') NOT NULL,
    grams DECIMAL(6,2) NOT NULL,
    calories DECIMAL(6,2) NOT NULL,
    protein DECIMAL(5,2) NOT NULL,
    carbs DECIMAL(5,2) NOT NULL,
    fat DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (daily_log_id) REFERENCES daily_logs(id) ON DELETE CASCADE,
    FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE
);

-- Grocery list
CREATE TABLE IF NOT EXISTS grocery_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    quantity DECIMAL(8,2),
    unit VARCHAR(20) DEFAULT 'g',
    category VARCHAR(50),
    is_purchased BOOLEAN DEFAULT FALSE,
    estimated_price_mad DECIMAL(8,2),
    week_start_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default users (the couple)
INSERT INTO users (name, weight_kg, gender, activity_level, daily_calorie_target, protein_target, carbs_target, fat_target) VALUES
('You', 115, 'male', 'sedentary', 1750, 160, 150, 60),
('Wife', 98, 'female', 'active', 1450, 120, 130, 50);

-- Insert comprehensive food database
INSERT INTO foods (name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g) VALUES
-- Proteins
('Chicken breast (grilled)', 'protein', 165, 31, 0, 3.6, 0),
('Chicken thigh (grilled)', 'protein', 209, 26, 0, 10.9, 0),
('Ground beef (lean)', 'protein', 250, 26, 0, 15, 0),
('Beef steak', 'protein', 271, 26, 0, 18, 0),
('Eggs (whole)', 'protein', 155, 13, 1.1, 11, 0),
('Egg whites', 'protein', 52, 11, 0.7, 0.2, 0),
('Sardines (fresh)', 'protein', 208, 25, 0, 11, 0),
('Sardines (canned in olive oil)', 'protein', 220, 24, 0, 14, 0),
('Shrimp', 'protein', 99, 24, 0.2, 0.3, 0),
('Salmon (grilled)', 'protein', 208, 20, 0, 13, 0),
('Tuna (canned in water)', 'protein', 116, 26, 0, 1, 0),
('Turkey breast', 'protein', 135, 30, 0, 1, 0),
('Lamb (lean)', 'protein', 250, 25, 0, 16, 0),
('Lentils (cooked)', 'protein', 116, 9, 20, 0.4, 8),
('Chickpeas (cooked)', 'protein', 164, 9, 27, 2.6, 8),

-- Carbs
('Rice (cooked white)', 'carbs', 130, 2.7, 28, 0.3, 0.4),
('Rice (cooked brown)', 'carbs', 123, 2.7, 26, 1, 1.8),
('Potato (boiled)', 'carbs', 87, 1.9, 20, 0.1, 1.8),
('Sweet potato (baked)', 'carbs', 90, 2, 21, 0.1, 3.3),
('Quinoa (cooked)', 'carbs', 120, 4.4, 21, 1.9, 2.8),
('Whole wheat pasta (cooked)', 'carbs', 124, 5, 25, 0.5, 4.5),
('Couscous (cooked)', 'carbs', 112, 3.8, 23, 0.2, 1.4),
('Oatmeal (cooked)', 'carbs', 68, 2.5, 12, 1.4, 1.7),
('Whole wheat bread', 'carbs', 247, 13, 41, 3.4, 7),
('Tortilla (whole wheat)', 'carbs', 267, 9, 44, 7, 3),

-- Vegetables
('Mixed vegetables (steamed)', 'vegetables', 65, 2.6, 13, 0.4, 4),
('Broccoli (steamed)', 'vegetables', 35, 2.4, 7, 0.4, 3.3),
('Zucchini', 'vegetables', 17, 1.2, 3.1, 0.3, 1),
('Bell peppers', 'vegetables', 31, 1, 6, 0.3, 2.1),
('Tomatoes', 'vegetables', 18, 0.9, 3.9, 0.2, 1.2),
('Cucumber', 'vegetables', 16, 0.7, 3.6, 0.1, 0.5),
('Spinach (raw)', 'vegetables', 23, 2.9, 3.6, 0.4, 2.2),
('Lettuce (mixed)', 'vegetables', 15, 1.3, 2.9, 0.2, 1.3),
('Onions', 'vegetables', 40, 1.1, 9.3, 0.1, 1.7),
('Carrots', 'vegetables', 41, 0.9, 10, 0.2, 2.8),
('Eggplant', 'vegetables', 25, 1, 6, 0.2, 3),
('Green beans', 'vegetables', 31, 1.8, 7, 0.1, 3.4),
('Cauliflower', 'vegetables', 25, 1.9, 5, 0.3, 2),
('Mushrooms', 'vegetables', 22, 3.1, 3.3, 0.3, 1),

-- Fruits
('Apple', 'fruits', 52, 0.3, 14, 0.2, 2.4),
('Banana', 'fruits', 89, 1.1, 23, 0.3, 2.6),
('Orange', 'fruits', 47, 0.9, 12, 0.1, 2.4),
('Pineapple', 'fruits', 50, 0.5, 13, 0.1, 1.4),
('Strawberries', 'fruits', 32, 0.7, 7.7, 0.3, 2),
('Watermelon', 'fruits', 30, 0.6, 7.6, 0.2, 0.4),
('Grapes', 'fruits', 69, 0.7, 18, 0.2, 0.9),
('Dates (dried)', 'fruits', 277, 1.8, 75, 0.2, 7),
('Avocado', 'fruits', 160, 2, 9, 15, 7),

-- Fats
('Olive oil', 'fats', 884, 0, 0, 100, 0),
('Almonds', 'fats', 579, 21, 22, 50, 12),
('Walnuts', 'fats', 654, 15, 14, 65, 7),
('Peanuts', 'fats', 567, 26, 16, 49, 8.5),
('Cashews', 'fats', 553, 18, 30, 44, 3.3),
('Peanut butter (natural)', 'fats', 588, 25, 20, 50, 6),
('Raisins', 'fats', 299, 3.1, 79, 0.5, 3.7),

-- Dairy
('Greek yogurt (plain)', 'dairy', 59, 10, 3.6, 0.7, 0),
('Cottage cheese', 'dairy', 98, 11, 3.4, 4.3, 0),
('Cheese (cheddar)', 'dairy', 403, 25, 1.3, 33, 0),
('Cheese (mozzarella)', 'dairy', 280, 28, 3.1, 17, 0),
('Milk (whole)', 'dairy', 61, 3.2, 4.8, 3.3, 0),
('Milk (skim)', 'dairy', 34, 3.4, 5, 0.1, 0),

-- Snacks & Other
('Hummus', 'snacks', 166, 8, 14, 10, 6),
('Guacamole', 'snacks', 160, 2, 9, 15, 7),
('Trail mix (nuts & dried fruit)', 'snacks', 462, 13, 45, 29, 4),
('Rice cakes', 'snacks', 387, 8, 82, 2.8, 1.7),
('Dark chocolate (70%)', 'snacks', 598, 7.8, 46, 43, 11),
('Honey', 'other', 304, 0.3, 82, 0, 0.2),
('Ginger (fresh)', 'other', 80, 1.8, 18, 0.8, 2);
