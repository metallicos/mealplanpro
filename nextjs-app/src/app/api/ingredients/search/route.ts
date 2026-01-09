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

            // 1. Remove unwanted prefixes and technical terms
            const removePatterns = [
                // Categories
                /^(Snacks|Fast foods|Sweets|Babyfood|Beverages|Baked Products|Cereals|Dairy and Egg Products), /i,
                // Technical/Processing terms
                /unenriched/gi, /formulation/gi, /survey/gi, /raw/gi, /ns as to form/gi,
                /unprepared/gi, /fresh/gi, /dry/gi, /solids/gi, /with salt/gi,
                /, Grade [A-Z]/gi, /, (large|medium|small|jumbo)/gi
            ];

            removePatterns.forEach(pattern => {
                cleaned = cleaned.replace(pattern, '');
            });

            // 2. Format "Name, descriptor" -> "Name (descriptor)"
            if (cleaned.includes(',')) {
                const parts = cleaned.split(',').map(s => s.trim()).filter(s => s);
                if (parts.length > 1) {
                    const main = parts[0];
                    const descriptors = parts.slice(1).join(', ');
                    cleaned = `${main} (${descriptors})`;
                }
            }

            // 3. Specific fixes
            if (cleaned.startsWith('Eggs ')) cleaned = cleaned.replace('Eggs', 'Egg');
            if (cleaned === 'Eggs') cleaned = 'Egg';

            // 4. Final cleanup
            cleaned = cleaned.replace(/\s+/g, ' ').trim();
            cleaned = cleaned.replace(/\(\s*\)/g, ''); // Empty parens

            // Capitalize
            if (cleaned.length > 0) {
                cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
            }

            return cleaned;
        };

        // Fetch ONLY Foundation data
        const response = await fetch(
            `${USDA_API_URL}?query=${encodeURIComponent(query)}&dataType=Foundation&pageSize=50&api_key=${USDA_API_KEY}`
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
                // Ensure no negative values
                return n ? Math.max(0, n.value) : 0;
            };

            const cleanedName = cleanName(food.description);

            return {
                id: food.fdcId,
                name: cleanedName,
                // Macros (with Math.max already in getNutrient)
                // Energy: Try 2047 (Atwater Specific) -> 2048 (Atwater General) -> 1008 (Kcal)
                calories: getNutrient(2047) || getNutrient(2048) || getNutrient(1008) || 0,
                protein: getNutrient(1003),
                fat: getNutrient(1004),
                carbs: getNutrient(1005),
                // Micronutrients - USDA nutrient IDs
                minerals: {
                    potassium: getNutrient(1092),  // Potassium, K
                    sodium: getNutrient(1093),      // Sodium, Na
                    zinc: getNutrient(1095),        // Zinc, Zn
                    iron: getNutrient(1089),        // Iron, Fe
                    calcium: getNutrient(1087),     // Calcium, Ca
                    magnesium: getNutrient(1090),   // Magnesium, Mg
                },
                fiber: getNutrient(1079),           // Fiber, total dietary
                sugar: getNutrient(2000),           // Sugars, total
                category: food.foodCategory || 'General'
            };
        });

        // 2. Deduplicate based on Cleaned Name and Data Quality
        const uniqueMap = new Map();
        rawIngredients.forEach((item: any) => {
            // Filter out items with very generic "Unknown" names or empty names
            if (!item.name || item.name.length < 2) return;

            // Update if not exists matching name
            // (Foundation data is usually high quality, so first match is often fine)
            if (!uniqueMap.has(item.name)) {
                uniqueMap.set(item.name, item);
            }
        });

        const ingredients = Array.from(uniqueMap.values());

        // 3. Sorting
        const q = query.toLowerCase();
        ingredients.sort((a: any, b: any) => {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();

            // Exact match
            if (nameA === q && nameB !== q) return -1;
            if (nameB === q && nameA !== q) return 1;

            // Starts with "Query (" (Noun priority with parens) e.g. "Rice (black)"
            const nounA = nameA.startsWith(q + ' (');
            const nounB = nameB.startsWith(q + ' (');
            if (nounA && !nounB) return -1;
            if (!nounB && nounA) return 1;

            // Starts with
            if (nameA.startsWith(q) && !nameB.startsWith(q)) return -1;
            if (nameB.startsWith(q) && !nameA.startsWith(q)) return 1;

            return nameA.length - nameB.length;
        });

        return NextResponse.json({ ingredients });

    } catch (error) {
        console.error('Search API error:', error);
        return NextResponse.json({ ingredients: [], error: 'Internal Server Error' }, { status: 500 });
    }
}
