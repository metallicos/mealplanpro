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

        const cleanName = (name: string) => {
            let cleaned = name;
            // Remove common category prefixes
            cleaned = cleaned.replace(/^(Snacks|Fast foods|Sweets|Babyfood|Beverages|Baked Products|Cereals|Dairy and Egg Products), /i, '');

            // Remove specific USDA grading terms and noise
            cleaned = cleaned.replace(/, Grade [A-Z]/gi, '');
            cleaned = cleaned.replace(/, (large|medium|small|jumbo)/gi, '');
            cleaned = cleaned.replace(/, (raw|fresh|unprepared|dry)/gi, '');
            cleaned = cleaned.replace(/, solids/gi, '');

            // Fix "Eggs" plural if it's the start
            if (cleaned.startsWith('Eggs, ')) {
                cleaned = cleaned.replace('Eggs, ', 'Egg, ');
            }
            if (cleaned === 'Eggs') cleaned = 'Egg';

            // Capitalize first letter
            return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        };

        // Fetch from USDA API with specific dataTypes to avoid Branded/Survey noise
        // foundation = newer, cleaner data
        // SR Legacy = older standard reference, very comprehensive
        const response = await fetch(
            `${USDA_API_URL}?query=${encodeURIComponent(query)}&dataType=Foundation,SR Legacy&pageSize=50&api_key=${USDA_API_KEY}`
        );

        if (!response.ok) {
            throw new Error(`USDA API Error: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.foods || !Array.isArray(data.foods)) {
            return NextResponse.json({ ingredients: [] });
        }

        // 1. Map and Clean
        const rawIngredients = data.foods.map((food: any) => {
            const getNutrient = (id: number) => {
                const n = food.foodNutrients.find((n: any) => n.nutrientId === id);
                return n ? n.value : 0;
            };

            // Prefer commonNames if available, otherwise description
            // SR Legacy often doesn't have commonNames, but Foundation does
            const rawName = food.commonNames || food.description;
            const cleanedName = cleanName(rawName);

            return {
                id: food.fdcId,
                name: cleanedName, // Use the cleaner name
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

        // 2. Deduplicate based on Cleaned Name
        const uniqueMap = new Map();
        rawIngredients.forEach((item: any) => {
            // If duplicate, prefer the one with more protein/calories (likely more complete data) or just first one
            // Simple approach: Keep first one, unless current one has significantly better data? 
            // Let's just keep first for stability for now, USDA ranking is usually okay.
            if (!uniqueMap.has(item.name)) {
                uniqueMap.set(item.name, item);
            }
        });

        const ingredients = Array.from(uniqueMap.values());

        // 3. Smart Sorting Logic
        const q = query.toLowerCase();
        // Singularize query for comparison (egg vs eggs)
        const qSingular = q.endsWith('s') ? q.slice(0, -1) : q;

        ingredients.sort((a: any, b: any) => {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();

            // 1. Exact match priority
            const isExactA = nameA === q || nameA === qSingular;
            const isExactB = nameB === q || nameB === qSingular;
            if (isExactA && !isExactB) return -1;
            if (!isExactA && isExactB) return 1;

            // 2. "Noun" priority: Starts with "Query," (e.g. "Rice, white")
            // This distinguishes "Rice, white" (good) from "Rice noodles" (bad for "rice" query)
            const nounA = nameA.startsWith(q + ',') || nameA.startsWith(qSingular + ',');
            const nounB = nameB.startsWith(q + ',') || nameB.startsWith(qSingular + ',');
            if (nounA && !nounB) return -1;
            if (!nounA && nounB) return 1;

            // 3. "Starts with" priority (general)
            const startA = nameA.startsWith(q) || nameA.startsWith(qSingular);
            const startB = nameB.startsWith(q) || nameB.startsWith(qSingular);
            if (startA && !startB) return -1;
            if (!startA && startB) return 1;

            // 4. Shortest name priority
            if (nameA.length !== nameB.length) {
                return nameA.length - nameB.length;
            }

            return 0;
        });

        return NextResponse.json({ ingredients });

    } catch (error) {
        console.error('Search API error:', error);
        return NextResponse.json({ ingredients: [], error: 'Internal Server Error' }, { status: 500 });
    }
}
