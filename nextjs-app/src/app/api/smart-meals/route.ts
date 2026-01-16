import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { checkUsageLimit, incrementUsage } from '@/lib/subscription';

export async function POST(request: NextRequest) {
    const auth = await getSession();
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check usage limit (2/week for free users, unlimited for premium/trial)
    const usage = await checkUsageLimit(auth.id, 'smart_plan');
    if (!usage.allowed) {
        return NextResponse.json({
            error: 'limit_reached',
            message: 'Weekly Smart Plan limit reached. Upgrade to Premium for unlimited access!',
            remaining: 0,
            limit: usage.limit,
            isPremium: usage.isPremium,
            isTrialing: usage.isTrialing,
            trialDaysRemaining: usage.trialDaysRemaining,
            upgradeRequired: true
        }, { status: 429 });
    }

    try {
        const { date } = await request.json(); // Allow getting plan for specific date
        // Use auth directly as it is the payload
        const userId = auth.id;

        // 1. Get User Profile for macro targets
        const profiles = await query('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
        if (!profiles || (profiles as any[]).length === 0) {
            return NextResponse.json({ error: 'Profile not found. Please set your goals first.' }, { status: 404 });
        }
        const profile = (profiles as any[])[0];

        // Targets (fallback to defaults if standard user hasn't set them)
        const targetKcal = profile.daily_calorie_target || 2000;
        const healthyOnly = true; // For now, default to healthy. Could be user setting.
        const lang = profile.preferred_language || 'en';

        // 2. Define Meal Slots & Targets
        // Breakfast: 25%, Lunch: 35%, Dinner: 30%, Snack: 10%
        const planStructure = [
            { type: 'breakfast', pct: 0.25, keywords: ['egg', 'oat', 'pancake', 'toast', 'porridge', 'breakfast', 'smoothie'] },
            { type: 'lunch', pct: 0.35, keywords: [] }, // Any main meal
            { type: 'dinner', pct: 0.30, keywords: [] }, // Any main meal
            { type: 'snack', pct: 0.10, keywords: ['cake', 'muffin', 'cookie', 'bar', 'snack', 'bite'] }
        ];

        const mealPlan = [];

        for (const slot of planStructure) {
            const slotTarget = targetKcal * slot.pct;
            const minKcal = slotTarget * 0.7; // +/- 30% tolerance
            const maxKcal = slotTarget * 1.3;

            // Build Query
            let keywordConditions = '';
            const params: any[] = [minKcal, maxKcal];

            if (slot.type === 'breakfast') {
                keywordConditions = 'AND (' + slot.keywords.map(() => 'LOWER(t.title) LIKE ?').join(' OR ') + ')';
                slot.keywords.forEach(k => params.push(`%${k}%`));
            } else if (slot.type === 'snack') {
                // Snacks: keywords OR low calorie items
                keywordConditions = 'AND ((' + slot.keywords.map(() => 'LOWER(t.title) LIKE ?').join(' OR ') + ') OR r.calories < 400)';
                slot.keywords.forEach(k => params.push(`%${k}%`));
            } else {
                // Main meals: exclude obvious desserts if possible, but for now just general query
                // Maybe exclude "cake" from lunch/dinner
                keywordConditions = "AND LOWER(t.title) NOT LIKE '%cake%' AND LOWER(t.title) NOT LIKE '%cookie%'";
            }

            const healthyClause = healthyOnly ? 'AND r.is_healthy = 1' : '';

            // Get random matching meal
            // Join with translations to get title
            const queryParams = [lang, ...params];
            const meals = await query(`
                SELECT r.*, r.calories as kcal, t.title, t.ingredients_json, t.method_json
                FROM recipes r
                JOIN recipe_translations t ON r.id = t.recipe_id
                WHERE t.language_code = ?
                AND r.calories BETWEEN ? AND ?
                ${healthyClause}
                ${keywordConditions}
                ORDER BY RANDOM()
                LIMIT 1
            `, queryParams);

            if ((meals as any[]).length > 0) {
                const meal = (meals as any[])[0];
                mealPlan.push({
                    slot: slot.type,
                    ...meal,
                    ingredients: JSON.parse(meal.ingredients_json || '[]'),
                    method: JSON.parse(meal.method_json || '[]')
                });
            } else {
                // Fallback
                const fallback = await query(`
                    SELECT r.*, r.calories as kcal, t.title, t.ingredients_json, t.method_json
                    FROM recipes r
                    JOIN recipe_translations t ON r.id = t.recipe_id
                    WHERE t.language_code = ?
                    AND r.calories BETWEEN ? AND ? 
                    AND r.is_healthy = 1
                    ORDER BY RANDOM() LIMIT 1
                `, [lang, minKcal * 0.5, maxKcal * 1.5]);

                if ((fallback as any[]).length > 0) {
                    const meal = (fallback as any[])[0];
                    mealPlan.push({
                        slot: slot.type,
                        ...meal,
                        ingredients: JSON.parse(meal.ingredients_json || '[]'),
                        method: JSON.parse(meal.method_json || '[]')
                    });
                }
            }
        }

        // Increment feature usage count
        await incrementUsage(auth.id, 'smart_plan');

        return NextResponse.json({
            date: date || new Date().toISOString().split('T')[0],
            targets: {
                calories: targetKcal,
                protein: profile.protein_target,
                carbs: profile.carbs_target,
                fat: profile.fat_target
            },
            meals: mealPlan,
            usage: {
                remaining: usage.remaining - 1,
                limit: usage.limit,
                isPremium: usage.isPremium,
                isTrialing: usage.isTrialing,
            }
        });

    } catch (error) {
        console.error('Smart plan error:', error);
        return NextResponse.json({ error: `Failed to generate plan: ${(error as Error).message}` }, { status: 500 });
    }
}
