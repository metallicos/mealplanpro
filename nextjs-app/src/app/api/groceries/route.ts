import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

interface GroceryBudget {
    id: number;
    household_id: number;
    month: string;
    initial_budget: number;
}

interface GroceryItem {
    id: number;
    budget_id: number;
    name: string;
    category: string;
    default_unit: string;
    estimated_price_per_unit: number;
    quantity: number;
    is_purchased: boolean;
    is_out_of_stock: boolean;
    buy_next_month: boolean;
    comment: string | null;
    actual_price: number | null;
}

// GET - Fetch all budgets with items for the user's household
export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session || !session.householdId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month');

        let budgetQuery = 'SELECT * FROM grocery_budgets WHERE household_id = ?';
        const budgetParams: (number | string)[] = [session.householdId];

        if (month) {
            budgetQuery += ' AND month = ?';
            budgetParams.push(month);
        }

        budgetQuery += ' ORDER BY month DESC';

        const budgets = await query<GroceryBudget[]>(budgetQuery, budgetParams);

        // Get items for each budget
        const result: Record<string, { month: string; initial_budget: number; items: GroceryItem[] }> = {};

        for (const budget of budgets) {
            const items = await query<GroceryItem[]>(
                'SELECT * FROM grocery_items WHERE budget_id = ? ORDER BY category, name',
                [budget.id]
            );

            result[budget.month] = {
                month: budget.month,
                initial_budget: budget.initial_budget,
                items: items.map(item => ({
                    ...item,
                    is_purchased: Boolean(item.is_purchased),
                    is_out_of_stock: Boolean(item.is_out_of_stock),
                    buy_next_month: Boolean(item.buy_next_month),
                })),
            };
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('GET /api/groceries error:', error);
        return NextResponse.json({ error: 'Failed to fetch groceries' }, { status: 500 });
    }
}

// POST - Save/update budget and items
export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || !session.householdId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { month, initial_budget, items } = body;

        if (!month) {
            return NextResponse.json({ error: 'Month is required' }, { status: 400 });
        }

        // Upsert budget
        await query(
            `INSERT INTO grocery_budgets (household_id, month, initial_budget) 
             VALUES (?, ?, ?)
             ON CONFLICT(household_id, month) DO UPDATE SET initial_budget = excluded.initial_budget`,
            [session.householdId, month, initial_budget || 3000]
        );

        // Get the budget ID
        const budgets = await query<GroceryBudget[]>(
            'SELECT id FROM grocery_budgets WHERE household_id = ? AND month = ?',
            [session.householdId, month]
        );

        if (budgets.length === 0) {
            return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 });
        }

        const budgetId = budgets[0].id;

        // Delete existing items and insert new ones
        await query('DELETE FROM grocery_items WHERE budget_id = ?', [budgetId]);

        if (items && items.length > 0) {
            for (const item of items) {
                await query(
                    `INSERT INTO grocery_items 
                     (budget_id, name, category, default_unit, estimated_price_per_unit, 
                      quantity, is_purchased, is_out_of_stock, buy_next_month, comment, actual_price)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        budgetId,
                        item.name,
                        item.category,
                        item.default_unit,
                        item.estimated_price_per_unit,
                        item.quantity || 1,
                        item.is_purchased ? 1 : 0,
                        item.is_out_of_stock ? 1 : 0,
                        item.buy_next_month ? 1 : 0,
                        item.comment || null,
                        item.actual_price || null,
                    ]
                );
            }
        }

        return NextResponse.json({ success: true, budget_id: budgetId });
    } catch (error) {
        console.error('POST /api/groceries error:', error);
        return NextResponse.json({ error: 'Failed to save groceries' }, { status: 500 });
    }
}

// DELETE - Delete a budget and its items
export async function DELETE(request: Request) {
    try {
        const session = await getSession();
        if (!session || !session.householdId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month');

        if (!month) {
            return NextResponse.json({ error: 'Month is required' }, { status: 400 });
        }

        await query(
            'DELETE FROM grocery_budgets WHERE household_id = ? AND month = ?',
            [session.householdId, month]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/groceries error:', error);
        return NextResponse.json({ error: 'Failed to delete groceries' }, { status: 500 });
    }
}
