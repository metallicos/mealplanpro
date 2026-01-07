import { MealPlan } from './types';

// Import all recipe data from JSON files
// This file consolidates all recipes from the recipes_sources folder

// Helper to parse nutritional values (removes 'g' suffix and converts to number)
export function parseNutrition(value: string): number {
    if (!value) return 0;
    return parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
}

// Get calories as number from nutritional_info
export function getCalories(meal: MealPlan): number {
    return parseNutrition(meal.nutritional_info?.kcal || '0');
}

// Get protein as number
export function getProtein(meal: MealPlan): number {
    return parseNutrition(meal.nutritional_info?.protein || '0');
}

// Get carbs as number  
export function getCarbs(meal: MealPlan): number {
    return parseNutrition(meal.nutritional_info?.carbs || '0');
}

// Get fat as number
export function getFat(meal: MealPlan): number {
    return parseNutrition(meal.nutritional_info?.fat || '0');
}

// Get fibre as number
export function getFibre(meal: MealPlan): number {
    return parseNutrition(meal.nutritional_info?.fibre || '0');
}

// Get all unique categories from meals
export function getUniqueCategories(meals: MealPlan[]): string[] {
    const categories = new Set<string>();
    meals.forEach(meal => {
        if (meal.category) categories.add(meal.category);
    });
    return Array.from(categories).sort();
}

// Get all unique subcategories from meals
export function getUniqueSubcategories(meals: MealPlan[], category?: string): string[] {
    const subcategories = new Set<string>();
    meals.forEach(meal => {
        if (meal.subcategory) {
            if (!category || meal.category === category) {
                subcategories.add(meal.subcategory);
            }
        }
    });
    return Array.from(subcategories).sort();
}

// Filter meals by category
export function filterByCategory(meals: MealPlan[], category: string): MealPlan[] {
    return meals.filter(meal => meal.category === category);
}

// Filter healthy meals only
export function filterHealthyMeals(meals: MealPlan[]): MealPlan[] {
    return meals.filter(meal => meal.isHealthy === true);
}

// Filter by calorie range
export function filterByCalories(meals: MealPlan[], min: number, max: number): MealPlan[] {
    return meals.filter(meal => {
        const cal = getCalories(meal);
        return cal >= min && cal <= max;
    });
}

// Search meals by title or description
export function searchMeals(meals: MealPlan[], query: string): MealPlan[] {
    const lowerQuery = query.toLowerCase();
    return meals.filter(meal =>
        meal.title.toLowerCase().includes(lowerQuery) ||
        meal.description?.toLowerCase().includes(lowerQuery) ||
        meal.ingredients.some(ing => ing.toLowerCase().includes(lowerQuery))
    );
}

// Sort meals by calories (ascending)
export function sortByCalories(meals: MealPlan[], ascending = true): MealPlan[] {
    return [...meals].sort((a, b) => {
        const diff = getCalories(a) - getCalories(b);
        return ascending ? diff : -diff;
    });
}

// Sort meals by protein (descending by default for high-protein diets)
export function sortByProtein(meals: MealPlan[], descending = true): MealPlan[] {
    return [...meals].sort((a, b) => {
        const diff = getProtein(a) - getProtein(b);
        return descending ? -diff : diff;
    });
}
