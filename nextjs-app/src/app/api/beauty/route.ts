
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get('barcode');

    if (!barcode) {
        return NextResponse.json({ error: 'Barcode is required' }, { status: 400 });
    }

    try {
        const response = await fetch(`https://world.openbeautyfacts.org/api/v2/product/${barcode}.json`);

        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json({ found: false });
            }
            throw new Error('Failed to fetch product data');
        }

        const data = await response.json();

        if (data.status === 0 || !data.product) {
            return NextResponse.json({ found: false });
        }

        const p = data.product;

        // Count additives (e.g. number of ingredients starting with 'e' or known additives)
        // OBF usually provides 'additives_n' or 'additives_tags'
        const additivesCount = p.additives_n || p.additives_tags?.length || 0;

        // Check for specific tags
        const isVegan = p.ingredients_analysis_tags?.includes('en:vegan') ||
            p.ingredients_analysis_tags?.includes('en:vegan-status-unknown'); // Optimistic or just check tags
        const hasPalmOil = p.ingredients_from_palm_oil_n > 0 ||
            p.ingredients_from_or_that_may_be_from_palm_oil_n > 0;

        const product = {
            barcode: p.code,
            name: p.product_name || 'Unknown Product',
            brand: p.brands || p.brands_tags?.[0] || 'Unknown Brand',
            image_url: p.image_front_url || p.image_small_url || null,
            quantity: p.quantity || null,
            ingredients_text: p.ingredients_text || null,
            additives_count: additivesCount,
            has_palm_oil: hasPalmOil,
            is_vegan: isVegan,
            // Pass raw tags if needed for detailed display
            additives_tags: p.additives_tags || [],
            categories: p.categories || ''
        };

        return NextResponse.json({ found: true, product });

    } catch (error) {
        console.error('Beauty API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch product information' }, { status: 500 });
    }
}
