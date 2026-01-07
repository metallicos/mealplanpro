import { NextResponse } from 'next/server';

const USDA_API_KEY = process.env.USDA_API_KEY;
const USDA_API_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
        return NextResponse.json({ ingredients: [] });
    }

    try {
        if (!USDA_API_KEY) {
            console.error('USDA_API_KEY is missing');
            return NextResponse.json({ ingredients: [], error: 'API Configuration Error' });
        }

        const response = await fetch(
            `${USDA_API_URL}?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}&pageSize=10&dataType=Foundation,SR Legacy`,
            { cache: 'force-cache' } // Cache common results or 'default'
        );

        if (!response.ok) {
            throw new Error(`USDA API Error: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.foods || !Array.isArray(data.foods)) {
            return NextResponse.json({ ingredients: [] });
        }

        const ingredients = data.foods.map((food: any) => {
            const getNutrient = (id: number) => {
                const n = food.foodNutrients.find((n: any) => n.nutrientId === id);
                return n ? n.value : 0;
            };

            return {
                id: food.fdcId,
                name: food.description,
                // Macros
                calories: getNutrient(2047) || getNutrient(1008) || 0, // 2047: Atwater General, 1008: Energy (kcal)
                protein: getNutrient(1003),
                fat: getNutrient(1004),
                carbs: getNutrient(1005),
                // Minerals
                minerals: {
                    calcium: getNutrient(1087),   // mg
                    iron: getNutrient(1089),      // mg
                    magnesium: getNutrient(1090), // mg
                    potassium: getNutrient(1092), // mg
                    sodium: getNutrient(1093),    // mg
                    zinc: getNutrient(1095)       // mg
                },
                category: food.foodCategory || 'Unknown'
            };
        });

        return NextResponse.json({ ingredients });

    } catch (error) {
        console.error('Search API error:', error);
        return NextResponse.json({ ingredients: [], error: 'Internal Server Error' }, { status: 500 });
    }
}
