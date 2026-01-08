import { NextRequest, NextResponse } from 'next/server';

// Open Food Facts API proxy
export async function GET(request: NextRequest) {
    const barcode = request.nextUrl.searchParams.get('barcode');

    if (!barcode) {
        return NextResponse.json({ error: 'Barcode is required' }, { status: 400 });
    }

    try {
        const response = await fetch(
            `https://world.openfoodfacts.org/api/v0/product/${barcode}.json?fields=product_name,nutriments,ingredients_text,brands,image_url,serving_size,nutriscore_grade,product_name_en,image_front_url`,
            {
                headers: {
                    'User-Agent': 'MealPlanPro/1.0 (contact@mealplanpro.com)'
                }
            }
        );

        const data = await response.json();

        if (data.status === 0) {
            return NextResponse.json({
                found: false,
                error: 'Product not found in database'
            });
        }

        const product = data.product;
        const nutriments = product.nutriments || {};

        return NextResponse.json({
            found: true,
            product: {
                barcode: barcode,
                name: product.product_name || product.product_name_en || 'Unknown Product',
                brand: product.brands || '',
                image_url: product.image_url || product.image_front_url || null,
                serving_size: product.serving_size || '100g',
                // Nutrition per 100g
                calories_per_100g: nutriments['energy-kcal_100g'] || nutriments['energy_100g'] / 4.184 || 0,
                protein_per_100g: nutriments['proteins_100g'] || 0,
                carbs_per_100g: nutriments['carbohydrates_100g'] || 0,
                fat_per_100g: nutriments['fat_100g'] || 0,
                fiber_per_100g: nutriments['fiber_100g'] || 0,
                sugar_per_100g: nutriments['sugars_100g'] || 0,
                sodium_per_100g: nutriments['sodium_100g'] || 0,
                // Nutri-score
                nutriscore: product.nutriscore_grade || null,
                // Ingredients
                ingredients_text: product.ingredients_text || null,
            }
        });
    } catch (error) {
        console.error('Open Food Facts API error:', error);
        return NextResponse.json({
            found: false,
            error: 'Failed to fetch product data'
        }, { status: 500 });
    }
}
