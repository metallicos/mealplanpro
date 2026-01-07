import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || '';

    try {
        // Get all unique categories with counts
        const categories = await query(`
            SELECT category, COUNT(*) as count 
            FROM recipes 
            GROUP BY category 
            ORDER BY count DESC
        `);

        // Get subcategories if category is specified
        let subcategories: unknown[] = [];
        if (category && category !== 'all') {
            subcategories = await query(`
                SELECT subcategory, COUNT(*) as count 
                FROM recipes 
                WHERE category = ? AND subcategory IS NOT NULL
                GROUP BY subcategory 
                ORDER BY count DESC
            `, [category]);
        }

        // Get total count
        const totalResult = await query('SELECT COUNT(*) as total FROM recipes');
        const total = ((totalResult as { total: number }[])[0]?.total) || 0;

        // Get healthy count
        const healthyResult = await query('SELECT COUNT(*) as count FROM recipes WHERE is_healthy = 1');
        const healthyCount = ((healthyResult as { count: number }[])[0]?.count) || 0;

        return NextResponse.json({
            categories: categories,
            subcategories: subcategories,
            stats: {
                total,
                healthy: healthyCount
            }
        });
    } catch (error) {
        console.error('Categories API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch categories' },
            { status: 500 }
        );
    }
}
