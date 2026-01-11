import { NextResponse } from 'next/server';

const USDA_API_KEY = process.env.USDA_API_KEY;
const USDA_API_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const lang = searchParams.get('lang') || 'en';

    if (!query || query.length < 2) {
        return NextResponse.json({ ingredients: [] });
    }

    // Helper to translate text using OpenRouter
    const translate = async (text: string | string[], targetLangCode: string, context: 'query' | 'results'): Promise<any> => {
        if (!process.env.OPENROUTER_API_KEY) return text;

        const langCode = targetLangCode.split('-')[0].toLowerCase();
        const langMap: Record<string, string> = {
            'fr': 'French',
            'es': 'Spanish',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'ja': 'Japanese',
            'ko': 'Korean',
            'zh': 'Chinese',
            'en': 'English',
            'id': 'Indonesian',
            'ms': 'Malay',
            'hi': 'Hindi',
            'ar': 'Arabic',
            'tr': 'Turkish',
            'nl': 'Dutch',
            'pl': 'Polish',
            'sv': 'Swedish',
            'vi': 'Vietnamese',
            'th': 'Thai'
        };

        const targetLang = langMap[langCode] || targetLangCode;
        console.log(`[Translation] Translating to: ${targetLang} (Code: ${targetLangCode})`);

        try {
            const prompt = context === 'query'
                ? `Translate this food search term from ${targetLang} to English. Output ONLY the English term, nothing else. Do not correct the spelling if it changes the meaning. Term: "${text}"`
                : `Translate these food ingredient names from English to ${targetLang}. Return ONLY a JSON object where keys are the English names and values are the ${targetLang} translations. Ensure the translations are accurate and specifically in ${targetLang}. If uncertain, keep the English name. Names: ${JSON.stringify(text)}`;

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://mealplanpro.app',
                    'X-Title': 'MealPlan Pro',
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-001',
                    messages: [
                        { role: 'system', content: context === 'query' ? 'You are a translator.' : 'You are a translator. JSON only.' },
                        { role: 'user', content: prompt }
                    ],
                    response_format: context === 'results' ? { type: 'json_object' } : undefined
                })
            });

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content?.trim();

            if (!content) return text;

            if (context === 'query') {
                return content.replace(/['"]/g, '').trim();
            } else {
                try {
                    // Robust JSON extraction: Find the first '{' and last '}'
                    const start = content.indexOf('{');
                    const end = content.lastIndexOf('}');

                    if (start !== -1 && end !== -1) {
                        const jsonStr = content.substring(start, end + 1);
                        return JSON.parse(jsonStr);
                    }
                    throw new Error('No JSON object found in response');
                } catch (e) {
                    console.error('Translation parse error', e);
                    return {};
                }
            }
        } catch (error) {
            console.error('Translation error:', error);
            // Return empty object for results context to avoid type errors
            return context === 'results' ? {} : text;
        }
    };

    try {
        if (!USDA_API_KEY) {
            console.error('USDA_API_KEY is missing');
            return NextResponse.json({ ingredients: [], error: 'API Configuration Error' });
        }

        // 1. Translate Query if needed
        let searchTerm = query;
        if (lang !== 'en') {
            searchTerm = await translate(query, lang, 'query');
            console.log(`Translated query: ${query} -> ${searchTerm}`);
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
            `${USDA_API_URL}?query=${encodeURIComponent(searchTerm)}&dataType=Foundation&pageSize=25&api_key=${USDA_API_KEY}`
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
                name: cleanedName, // Keep English name for now
                originalName: cleanedName,
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

        // Deduplicate and Sort (similar to before)
        const uniqueMap = new Map();
        rawIngredients.forEach((item: any) => {
            if (!item.name || item.name.length < 2) return;
            // Favor items with shorter names or foundation data (which this is)
            if (!uniqueMap.has(item.name)) {
                uniqueMap.set(item.name, item);
            }
        });

        let ingredients = Array.from(uniqueMap.values());

        // Sort by relevance to English term
        const qLower = searchTerm.toLowerCase();
        ingredients.sort((a, b) => {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            if (nameA === qLower && nameB !== qLower) return -1;
            if (nameB === qLower && nameA !== qLower) return 1;
            return nameA.length - nameB.length;
        });

        // Limit results before translation to save tokens/time
        ingredients = ingredients.slice(0, 15);

        // 2. Translate Results if needed
        if (lang !== 'en' && ingredients.length > 0) {
            const namesToTranslate = ingredients.map((i: any) => i.name);
            const translations = await translate(namesToTranslate, lang, 'results');

            ingredients = ingredients.map((item: any) => ({
                ...item,
                name: translations[item.name] || item.name // Apply translation or fallback to English
            }));
        }

        return NextResponse.json({ ingredients });

    } catch (error) {
        console.error('Search API error:', error);
        return NextResponse.json({ ingredients: [], error: 'Internal Server Error' }, { status: 500 });
    }
}
