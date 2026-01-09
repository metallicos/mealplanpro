
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const { id } = params;

    try {
        // Get recipe with translation (default to English)
        const recipes = await query(`
            SELECT r.*, rt.title, rt.description, rt.ingredients_json, rt.method_json
            FROM recipes r
            LEFT JOIN recipe_translations rt ON r.id = rt.recipe_id AND rt.language_code = 'en'
            WHERE r.id = ?
        `, [id]);

        if (!recipes || (recipes as unknown[]).length === 0) {
            return NextResponse.json(
                { error: 'Recipe not found' },
                { status: 404 }
            );
        }

        const recipe = (recipes as Record<string, unknown>[])[0];

        // Format prep/cook time from INTEGER to string
        // NOTE: Some data was imported incorrectly (e.g., "20 mins Cook: 10 mins" → 2010)
        // We detect this and try to extract sensible values
        const formatTime = (minutes: unknown): string => {
            if (!minutes || minutes === 0) return 'N/A';
            const mins = Number(minutes);
            if (isNaN(mins)) return String(minutes);

            // If the value looks like MMSS or HHMM encoding (e.g., 2015 = 20 mins + 15 mins)
            // Values > 480 mins (8 hours) are likely encoding errors
            if (mins > 480) {
                // Try to interpret as MMSS where first 2+ digits are minutes
                const firstPart = Math.floor(mins / 100);
                const secondPart = mins % 100;
                // If both parts are reasonable (<120 mins), use first part
                if (firstPart < 120 && secondPart < 60) {
                    return `${firstPart} mins`;
                }
                // Otherwise just show the first 2 digits as minutes
                const estimated = Math.floor(mins / 100);
                return `${estimated} mins`;
            }

            const hrs = Math.floor(mins / 60);
            const remainingMins = mins % 60;
            if (hrs > 0 && remainingMins > 0) return `${hrs}h ${remainingMins}m`;
            if (hrs > 0) return `${hrs}h`;
            return `${remainingMins} mins`;
        };

        // Parse ingredients JSON
        let ingredients: string[] = [];
        try {
            if (recipe.ingredients_json) {
                const parsed = JSON.parse(recipe.ingredients_json as string);
                // Handle both array of strings and array of objects
                ingredients = Array.isArray(parsed)
                    ? parsed.map((item: unknown) => {
                        if (typeof item === 'string') return item;
                        if (typeof item === 'object' && item !== null) {
                            const obj = item as Record<string, unknown>;
                            // Format: "200g Chicken breast"
                            const qty = obj.quantity || '';
                            const unit = obj.unit || '';
                            const name = obj.item || obj.name || '';
                            return `${qty}${unit} ${name}`.trim();
                        }
                        return String(item);
                    })
                    : [];
            }
        } catch (e) {
            console.error('Failed to parse ingredients:', e);
        }

        // Parse method JSON
        let method: string[] = [];
        try {
            if (recipe.method_json) {
                method = JSON.parse(recipe.method_json as string);
            }
        } catch (e) {
            console.error('Failed to parse method:', e);
        }

        // Build response with correctly mapped fields
        const parsedRecipe = {
            id: recipe.id,
            title: recipe.title || 'Untitled Recipe',
            description: recipe.description || '',
            prep_time: formatTime(recipe.prep_time),
            cook_time: formatTime(recipe.cook_time),
            serves: String(recipe.serves || 4),
            kcal: Number(recipe.calories) || 0,
            protein: Number(recipe.protein) || 0,
            carbs: Number(recipe.carbs) || 0,
            fat: Number(recipe.fat) || 0,
            ingredients,
            method,
            image_url: recipe.image_url || '',
            local_image_path: recipe.local_image_path || '',
            category: recipe.category || 'General',
            isHealthy: recipe.is_healthy === 1,
        };

        return NextResponse.json(parsedRecipe);
    } catch (error) {
        console.error('Recipe fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch recipe' },
            { status: 500 }
        );
    }
}
