
import { NextResponse } from 'next/server';

interface EnrichedProduct {
    barcode: string;
    name: string;
    brand: string;
    image_url: string | null;
    image_ingredients_url: string | null;
    ingredients_text: string | null;
    additives_count: number;
    has_palm_oil: boolean;
    is_vegan: boolean;
    additives_tags: string[];
    categories: string;
    source: 'beauty' | 'product' | 'food';
    score: number;
    risk_level: 'excellent' | 'good' | 'poor' | 'bad';
    analysis: {
        positives: string[];
        negatives: string[];
    };
}

// Helper to fetch from a specific Open*Facts API
async function fetchFromAPI(domain: string, barcode: string): Promise<any | null> {
    try {
        const res = await fetch(`https://${domain}/api/v2/product/${barcode}.json`, {
            headers: { 'User-Agent': 'MealPlanPro/1.0' }
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data.status === 1 && data.product) return data.product;
        return null;
    } catch (e) {
        return null; // Fail silently to try next API
    }
}

// Scoring Engine (Yuka-style approximation)
function calculateScore(p: any): { score: number, positives: string[], negatives: string[] } {
    let score = 100;
    const positives: string[] = [];
    const negatives: string[] = [];

    // 1. Additives Analysis
    const additives = p.additives_tags || [];
    const riskyAdditives = additives.filter((a: string) =>
        // Simple heuristic for "risky" additives (e.g., Sodium Laureth Sulfate, Parabens in simplified form)
        // In a real app, this would be a large database lookup.
        // We use the 'en:' prefix provided by OBF.
        a.includes('paraben') || a.includes('triclosan') || a.includes('bht') || a.includes('sulfate')
    );

    if (riskyAdditives.length > 0) {
        score -= (riskyAdditives.length * 30);
        negatives.push(`${riskyAdditives.length} Risky Additive${riskyAdditives.length > 1 ? 's' : ''}`);
    } else if (additives.length > 0) {
        // Moderate penalty for generic additives
        score -= (additives.length * 5);
        if (additives.length > 3) negatives.push(`${additives.length} Additives (Moderate Risk)`);
    } else {
        positives.push('No Additives');
    }

    // 2. Palm Oil
    if (p.ingredients_from_palm_oil_n > 0 || p.ingredients_from_or_that_may_be_from_palm_oil_n > 0) {
        score -= 15;
        negatives.push('Contains Palm Oil');
    } else {
        positives.push('Palm Oil Free');
    }

    // 3. Allergens (Simple check)
    if (p.allergens_tags && p.allergens_tags.length > 0) {
        score -= (p.allergens_tags.length * 5);
        negatives.push('Contains Potential Allergens');
    }

    // 4. NOVA Group (If food product found)
    if (p.nova_group) {
        if (p.nova_group === 4) { score -= 20; negatives.push('Ultra-Processed'); }
        if (p.nova_group === 1) { score += 10; positives.push('Unprocessed Product'); }
    }

    // 5. Eco-Score / Labels
    if (p.labels_tags?.includes('en:organic')) {
        score += 10;
        positives.push('Organic Product');
    }
    if (p.labels_tags?.includes('en:vegan')) {
        positives.push('Vegan');
    }

    // Clamp score
    return {
        score: Math.max(0, Math.min(100, score)),
        positives,
        negatives
    };
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get('barcode');

    if (!barcode) {
        return NextResponse.json({ error: 'Barcode is required' }, { status: 400 });
    }

    let productData = null;
    let source: 'beauty' | 'product' | 'food' = 'beauty';

    // 1. Waterfall Fetch
    // Try Beauty first
    productData = await fetchFromAPI('world.openbeautyfacts.org', barcode);

    // Try Products (Cleaning, etc.)
    if (!productData) {
        productData = await fetchFromAPI('world.openproductsfacts.org', barcode);
        source = 'product';
    }

    // Try Food (Fallback)
    if (!productData) {
        productData = await fetchFromAPI('world.openfoodfacts.org', barcode);
        source = 'food';
    }

    if (!productData) {
        return NextResponse.json({ found: false });
    }

    // 2. Normalize & Score
    const p = productData;
    const { score, positives, negatives } = calculateScore(p);

    const riskLevel = score >= 75 ? 'excellent' :
        score >= 50 ? 'good' :
            score >= 25 ? 'poor' : 'bad';

    const ingredientsText = p.ingredients_text ||
        p.ingredients_text_en ||
        p.ingredients_text_fr ||
        null;

    const enrichedProduct: EnrichedProduct = {
        barcode: p.code,
        name: p.product_name || p.product_name_en || p.product_name_fr || 'Unknown Product',
        brand: p.brands || p.brands_tags?.[0] || 'Unknown Brand',
        image_url: p.image_front_url || p.image_small_url || p.image_url || null,
        image_ingredients_url: p.image_ingredients_url || null,
        ingredients_text: ingredientsText,
        additives_count: p.additives_n || p.additives_tags?.length || 0,
        additives_tags: p.additives_tags || [],
        has_palm_oil: p.ingredients_from_palm_oil_n > 0 || p.ingredients_from_or_that_may_be_from_palm_oil_n > 0,
        is_vegan: p.labels_tags?.includes('en:vegan') || false,
        categories: p.categories || '',
        source,
        score,
        risk_level: riskLevel,
        analysis: { positives, negatives }
    };

    return NextResponse.json({ found: true, product: enrichedProduct });
}
