import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q');

    if (!q || q.length < 2) {
        return NextResponse.json({ ingredients: [] });
    }

    try {
        const ingredients = await query(`
            SELECT * FROM ingredients 
            WHERE name LIKE ? 
            ORDER BY 
              CASE WHEN name LIKE ? THEN 0 ELSE 1 END,
              length(name) ASC 
            LIMIT 20
        `, [`%${q}%`, `${q}%`]);

        return NextResponse.json({ ingredients });
    } catch (error) {
        console.error('Ingredient search error:', error);
        return NextResponse.json(
            { error: 'Failed to search ingredients' },
            { status: 500 }
        );
    }
}
