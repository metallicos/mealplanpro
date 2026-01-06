// Convert recipes.json to meal-plans.ts format
const fs = require('fs');
const path = require('path');

// Read recipes.json
const recipesPath = path.join(__dirname, '..', 'recipes.json');
const recipesData = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));

// Macro estimates by category
const macrosByCategory = {
    'Chicken': { calories: 450, protein: 40, carbs: 25, fat: 18 },
    'Beef': { calories: 520, protein: 38, carbs: 20, fat: 28 },
    'Lamb': { calories: 550, protein: 35, carbs: 15, fat: 32 },
    'Pork': { calories: 500, protein: 35, carbs: 20, fat: 28 },
    'Goat': { calories: 480, protein: 32, carbs: 15, fat: 25 },
    'Seafood': { calories: 380, protein: 35, carbs: 20, fat: 15 },
    'Vegetarian': { calories: 350, protein: 15, carbs: 45, fat: 12 },
    'Vegan': { calories: 320, protein: 12, carbs: 48, fat: 10 },
    'Pasta': { calories: 480, protein: 18, carbs: 60, fat: 16 },
    'Dessert': { calories: 350, protein: 6, carbs: 48, fat: 16 },
    'Side': { calories: 200, protein: 5, carbs: 30, fat: 8 },
    'Starter': { calories: 250, protein: 10, carbs: 25, fat: 12 },
    'Breakfast': { calories: 400, protein: 20, carbs: 40, fat: 18 },
    'Miscellaneous': { calories: 400, protein: 20, carbs: 35, fat: 18 }
};

// Color palettes by category
const colorsByCategory = {
    'Chicken': { from: '#f59e0b', to: '#d97706' },
    'Beef': { from: '#ef4444', to: '#dc2626' },
    'Lamb': { from: '#ec4899', to: '#db2777' },
    'Pork': { from: '#f472b6', to: '#e11d48' },
    'Goat': { from: '#a855f7', to: '#9333ea' },
    'Seafood': { from: '#06b6d4', to: '#0891b2' },
    'Vegetarian': { from: '#22c55e', to: '#16a34a' },
    'Vegan': { from: '#84cc16', to: '#65a30d' },
    'Pasta': { from: '#f97316', to: '#ea580c' },
    'Dessert': { from: '#ec4899', to: '#db2777' },
    'Side': { from: '#8b5cf6', to: '#7c3aed' },
    'Starter': { from: '#14b8a6', to: '#0d9488' },
    'Breakfast': { from: '#fbbf24', to: '#f59e0b' },
    'Miscellaneous': { from: '#6366f1', to: '#4f46e5' }
};

// Emoji by category/cuisine
const emojiByCategory = {
    'Chicken': '🍗',
    'Beef': '🥩',
    'Lamb': '🍖',
    'Pork': '🐷',
    'Goat': '🐐',
    'Seafood': '🐟',
    'Vegetarian': '🥗',
    'Vegan': '🥬',
    'Pasta': '🍝',
    'Dessert': '🍰',
    'Side': '🥔',
    'Starter': '🥄',
    'Breakfast': '🍳',
    'Miscellaneous': '🍽️'
};

// Parse instructions into array
function parseInstructions(instructionsText) {
    if (!instructionsText) return ['Follow recipe instructions'];

    // Split by step markers, newlines, or numbered steps
    const steps = instructionsText
        .replace(/step \d+\r?\n/gi, '') // Remove "step 1" markers
        .split(/\r?\n\r?\n/) // Split by double newlines
        .map(s => s.trim())
        .filter(s => s.length > 10); // Filter out very short fragments

    return steps.length > 0 ? steps : [instructionsText.substring(0, 500)];
}

// Extract ingredients
function getIngredients(meal) {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        if (ingredient && ingredient.trim()) {
            const measureStr = (measure && measure.trim()) ? `${measure.trim()} ` : '';
            ingredients.push(`${measureStr}${ingredient.trim()}`);
        }
    }
    return ingredients;
}

// Estimate prep time from instructions length
function estimatePrepTime(instructions) {
    if (!instructions) return 30;
    const wordCount = instructions.split(' ').length;
    if (wordCount < 100) return 15;
    if (wordCount < 200) return 25;
    if (wordCount < 400) return 35;
    return 45;
}

// Convert meals
const mealPlans = recipesData.meals.map((meal, index) => {
    const category = meal.strCategory || 'Miscellaneous';
    const macros = macrosByCategory[category] || macrosByCategory['Miscellaneous'];
    const colors = colorsByCategory[category] || colorsByCategory['Miscellaneous'];
    const emoji = emojiByCategory[category] || '🍽️';

    return {
        id: index + 1,
        name: meal.strMeal,
        description: `Traditional ${meal.strArea || 'International'} ${category.toLowerCase()} dish`,
        cuisine: meal.strArea || 'International',
        category: category,
        prep_time: estimatePrepTime(meal.strInstructions),
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        ingredients: getIngredients(meal),
        instructions: parseInstructions(meal.strInstructions),
        image_emoji: emoji,
        image_url: meal.strMealThumb || undefined,
        youtube_url: meal.strYoutube || undefined,
        source_url: meal.strSource || undefined,
        color_from: colors.from,
        color_to: colors.to
    };
});

// Generate TypeScript file content
const tsContent = `import { MealPlan } from './types';

// ${mealPlans.length} International Meal Plans from TheMealDB
export const mealPlans: MealPlan[] = ${JSON.stringify(mealPlans, null, 2)};

// Helper function to get random meals
export function getRandomMeals(count: number = 6): MealPlan[] {
    const shuffled = [...mealPlans].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

// Filter meals by cuisine
export function getMealsByCuisine(cuisine: string): MealPlan[] {
    return mealPlans.filter(m => m.cuisine.toLowerCase() === cuisine.toLowerCase());
}

// Filter meals by category
export function getMealsByCategory(category: string): MealPlan[] {
    return mealPlans.filter(m => m.category?.toLowerCase() === category.toLowerCase());
}

// Search meals
export function searchMeals(query: string): MealPlan[] {
    const q = query.toLowerCase();
    return mealPlans.filter(m => 
        m.name.toLowerCase().includes(q) ||
        m.cuisine.toLowerCase().includes(q) ||
        m.category?.toLowerCase().includes(q) ||
        m.ingredients.some(i => i.toLowerCase().includes(q))
    );
}

// Get unique cuisines
export function getUniqueCuisines(): string[] {
    return [...new Set(mealPlans.map(m => m.cuisine))].sort();
}

// Get unique categories
export function getUniqueCategories(): string[] {
    return [...new Set(mealPlans.map(m => m.category).filter(Boolean))].sort();
}
`;

// Write output
const outputPath = path.join(__dirname, 'src', 'lib', 'meal-plans.ts');
fs.writeFileSync(outputPath, tsContent);

console.log(`✅ Converted ${mealPlans.length} recipes to meal-plans.ts`);
console.log(`📍 Output: ${outputPath}`);
console.log(`📊 Categories: ${[...new Set(mealPlans.map(m => m.category))].join(', ')}`);
console.log(`🌍 Cuisines: ${[...new Set(mealPlans.map(m => m.cuisine))].length} unique cuisines`);
