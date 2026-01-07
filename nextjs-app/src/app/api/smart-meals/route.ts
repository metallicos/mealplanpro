import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
    const auth = await getSession();
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
                keywordConditions = 'AND (' + slot.keywords.map(() => 'LOWER(title) LIKE ?').join(' OR ') + ')';
                slot.keywords.forEach(k => params.push(`%${k}%`));
            } else if (slot.type === 'snack') {
                // Snacks: keywords OR low calorie items
                keywordConditions = 'AND ((' + slot.keywords.map(() => 'LOWER(title) LIKE ?').join(' OR ') + ') OR kcal < 400)';
                slot.keywords.forEach(k => params.push(`%${k}%`));
            } else {
                // Main meals: exclude obvious desserts if possible, but for now just general query
                // Maybe exclude "cake" from lunch/dinner
                keywordConditions = "AND LOWER(title) NOT LIKE '%cake%' AND LOWER(title) NOT LIKE '%cookie%'";
            }

            const healthyClause = healthyOnly ? 'AND is_healthy = 1' : '';

            // Get random matching meal
            const meals = await query(`
                SELECT * FROM recipes 
                WHERE kcal BETWEEN ? AND ?
                ${healthyClause}
                ${keywordConditions}
                ORDER BY RANDOM()
                LIMIT 1
            `, params);

            if ((meals as any[]).length > 0) {
                const meal = (meals as any[])[0];
                mealPlan.push({
                    slot: slot.type,
                    ...meal,
                    ingredients: JSON.parse(meal.ingredients || '[]'),
                    method: JSON.parse(meal.method || '[]')
                });
            } else {
                // Fallback: relax constraints if no meal found (e.g. just calories)
                const fallback = await query(`
                    SELECT * FROM recipes 
                    WHERE kcal BETWEEN ? AND ?
                    ORDER BY RANDOM() LIMIT 1
                `, [minKcal * 0.5, maxKcal * 1.5]); // Wider range

                if ((fallback as any[]).length > 0) {
                    const meal = (fallback as any[])[0];
                    mealPlan.push({
                        slot: slot.type,
                        ...meal,
                        ingredients: JSON.parse(meal.ingredients || '[]'),
                        method: JSON.parse(meal.method || '[]')
                    });
                }
            }
        }

        return NextResponse.json({
            date: date || new Date().toISOString().split('T')[0],
            targets: {
                calories: targetKcal,
                protein: profile.protein_target,
                carbs: profile.carbs_target,
                fat: profile.fat_target
            },
            meals: mealPlan
        });

    } catch (error) {
        console.error('Smart plan error:', error);
        return NextResponse.json({ error: 'Failed to generate plan' }, { status: 500 });
    }
}
