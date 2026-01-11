import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
// Using a reliable model via OpenRouter. 
const MODEL = 'google/gemini-2.0-flash-001';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!OPENROUTER_API_KEY) {
            console.error('OPENROUTER_API_KEY is missing');
            return NextResponse.json({ error: 'AI Service Config Error' }, { status: 500 });
        }

        const today = new Date().toISOString().split('T')[0];

        // 0. Check Usage Quota (Max 3 per day)
        const logs = await query(
            'SELECT COUNT(*) as count FROM ai_workout_logs WHERE user_id = ? AND date = ?',
            [session.id, today]
        );
        const usageCount = (logs as any[])[0]?.count || 0;

        if (usageCount >= 3) {
            return NextResponse.json({
                error: 'Daily limit reached. You can generate up to 3 workouts per day.',
                limitReached: true
            }, { status: 429 });
        }

        // 1. Get User Context (Profile + Recent Logs)
        const profiles = await query('SELECT * FROM user_profiles WHERE user_id = ?', [session.id]);
        const profile = (profiles as any[])[0] || {};

        // Get Input Data
        const body = await request.json().catch(() => ({}));
        const locale = body.locale || 'en';

        // Get today's check-in (mood, sleep, sport type preference)
        const checkins = await query('SELECT * FROM daily_checkins WHERE user_id = ? AND date = ?', [session.id, today]);
        const checkin = (checkins as any[])[0] || {};

        // 2. Construct Prompt
        const languageName = locale === 'fr' ? 'French (Français)' : locale === 'es' ? 'Spanish (Español)' : 'English';

        const systemPrompt = `
        STRICT LANGUAGE REQUIREMENT: You MUST answer in ${languageName}.
        
        You are an elite fitness coach for "MealPlan Pro". 
        Goal: Generate ONE single, highly optimized workout session for today.

        User Profile:
        - Goal: ${JSON.stringify(profile.macros_goal) || 'General Health'}
        - Fitness Level: ${profile.activity_level || 'Intermediate'}
        - Restrictions: ${profile.dietary_restrictions || 'None'}
        
        Today's Status:
        - Sleep: ${checkin.sleep_hours || '?'} hrs
        - Energy: ${checkin.energy_level || 5}/10
        - Mood: ${checkin.mood_score || 5}/10
        - Preference: ${checkin.sport_type || 'Coach Decision'}
        - Location: ${checkin.training_location || 'Gym'}

        Requirements:
        1. **Motivational Speech:** Short, punchy, related to their specific goal and today's energy. (${languageName})
        2. **The Workout:** ONE solid session. No options. Exactly what they need to do today to hit their goal.
        3. **Structure:** Warmup -> Main Circuit -> Cooldown.
        4. **Format:** JSON only.

        JSON Structure:
        {
            "motivation": "string",
            "workout": {
                "title": "string (e.g., 'HIIT Fat Burner' or 'Heavy Leg Day')",
                "duration": "string (e.g., '45 min')",
                "difficulty": "Easy/Medium/Hard",
                "exercises": [
                    { "name": "string", "sets": "string", "reps": "string", "rest": "string" }
                ]
            },
            "recommendation": "Brief tip on why this specific workout helps their goal..."
        }
        `;

        // 3. Call OpenRouter API
        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://mealplanpro.app',
                'X-Title': 'MealPlan Pro',
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: systemPrompt }
                ],
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('OpenRouter API Error:', err);
            return NextResponse.json({ error: 'AI Service Unavailable' }, { status: 500 });
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) throw new Error('No content received from AI');

        const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(jsonStr);

        // 4. Log Usage
        await query(
            'INSERT INTO ai_workout_logs (user_id, date, model) VALUES (?, ?, ?)',
            [session.id, today, MODEL]
        );

        return NextResponse.json(result);

    } catch (error) {
        console.error('AI Coach API Error:', error);
        return NextResponse.json({ error: 'Failed to generate plan' }, { status: 500 });
    }
}
