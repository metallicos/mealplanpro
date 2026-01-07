// Food type
export interface Food {
    id: number;
    name: string;
    category: string;
    calories_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
    fiber_per_100g: number;
}

// User type
export interface User {
    id: number;
    name: string;
    weight_kg: number;
    height_cm: number | null;
    age: number | null;
    gender: 'male' | 'female';
    activity_level: string;
    daily_calorie_target: number;
    protein_target: number;
    carbs_target: number;
    fat_target: number;
}

// Daily log
export interface DailyLog {
    id: number;
    user_id: number;
    log_date: string;
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
    weight_kg: number | null;
    items?: DailyLogItem[];
}

export interface DailyLogItem {
    id: number;
    daily_log_id: number;
    food_id: number;
    food_name?: string;
    meal_type: 'main' | 'snack';
    grams: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

// Grocery item
export interface GroceryItem {
    id: number;
    name: string;
    quantity: number | null;
    unit: string;
    category: string;
    is_purchased: boolean;
    estimated_price_mad: number | null;
    week_start_date: string | null;
}

// Nutritional info (per serving) - New BBC Good Food format
export interface NutritionalInfo {
    kcal: string;
    fat: string;
    saturates: string;
    carbs: string;
    sugars: string;
    fibre: string;
    protein: string;
    salt: string;
}

// Meal/Recipe - New BBC Good Food format
export interface MealPlan {
    id?: number;
    url?: string;
    title: string;
    description: string;
    prep_time: string;
    cook_time?: string;
    serves: string;
    ingredients: string[];
    method: string[];
    nutritional_info: NutritionalInfo;
    image_url: string;
    local_image_path: string;
    // Category & flags
    category: string;        // e.g., "healthy", "cuisine", "cakes-baking", "ramadan"
    subcategory?: string;    // e.g., "gluten-free", "moroccan", "chocolate-cake"
    isHealthy: boolean;      // true for all recipes from healthy folder
    tags?: string[];
}

// Statistics
export interface Statistics {
    user: User;
    period: {
        start: string;
        end: string;
        days_logged: number;
    };
    averages: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
    };
    adherence: {
        calories_percent: number;
        protein_percent: number;
    };
    weight: {
        start: number | null;
        current: number | null;
        change: number;
        history: { date: string; weight: number }[];
    };
    chart: {
        labels: string[];
        calories: number[];
        protein: number[];
        carbs: number[];
        fat: number[];
    };
    top_foods: {
        name: string;
        category: string;
        times_eaten: number;
        total_grams: number;
    }[];
}
