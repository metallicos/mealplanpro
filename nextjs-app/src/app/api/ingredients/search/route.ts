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

        const cleanName = (name: string) => {
            let cleaned = name;
            // Remove common category prefixes
            cleaned = cleaned.replace(/^(Snacks|Fast foods|Sweets|Babyfood|Beverages|Baked Products|Cereals|Dairy and Egg Products), /i, '');

            // formatting
            cleaned = cleaned.replace(/, unprepared/gi, '');
            cleaned = cleaned.replace(/, raw/gi, ''); // usually implied for basic ingredients
            cleaned = cleaned.replace(/, dry/gi, '');

            // Capitalize first letter
            return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        };

        const ingredients = data.foods.map((food: any) => {
            const getNutrient = (id: number) => {
                const n = food.foodNutrients.find((n: any) => n.nutrientId === id);
                return n ? n.value : 0;
            };

            return {
                id: food.fdcId,
                name: cleanName(food.description),
                original_name: food.description,
                // Macros
                calories: getNutrient(2047) || getNutrient(1008) || 0,
                protein: getNutrient(1003),
                fat: getNutrient(1004),
                carbs: getNutrient(1005),
                // Minerals
                minerals: {
                    calcium: getNutrient(1087),
                    iron: getNutrient(1089),
                    magnesium: getNutrient(1090),
                    potassium: getNutrient(1092),
                    sodium: getNutrient(1093),
                    zinc: getNutrient(1095)
                },
                category: food.foodCategory || 'Unknown'
            };
        });

        // --- Smart Sorting Logic ---
        const q = query.toLowerCase();

        ingredients.sort((a: any, b: any) => {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();

            // 1. Exact match priority
            if (nameA === q) return -1;
            if (nameB === q) return 1;

            // 2. "Starts with" priority
            const startA = nameA.startsWith(q);
            const startB = nameB.startsWith(q);
            if (startA && !startB) return -1;
            if (!startA && startB) return 1;

            // 3. De-prioritize complex/processed items if simpler exists
            if (nameA.length !== nameB.length) {
                return nameA.length - nameB.length;
            }

            return 0;
        });
        // ---------------------------

        return NextResponse.json({ ingredients });

    } catch (error) {
        console.error('Search API error:', error);
        return NextResponse.json({ ingredients: [], error: 'Internal Server Error' }, { status: 500 });
    }
}
