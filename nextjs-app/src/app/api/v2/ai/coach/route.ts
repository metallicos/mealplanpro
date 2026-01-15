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

        // Limit Check Removed

        // 1. Get User Context (Profile + Recent Logs)

        // 1. Get User Context (Profile + Recent Logs)
        const profiles = await query('SELECT * FROM user_profiles WHERE user_id = ?', [session.id]);
        const profile = (profiles as any[])[0] || {};

        // 1.1 Get Workout History (Last 5 sessions for progressive overload context)
        const historyLogs = await query(
            'SELECT * FROM completed_workouts WHERE user_id = ? ORDER BY date DESC LIMIT 5',
            [session.id]
        );
        const history = (historyLogs as any[]).map(log => {
            const feedback = JSON.parse(log.feedback_json || '{}');
            const workout = JSON.parse(log.workout_json || '{}');
            return `Date: ${log.date}, Workout: ${workout.title}, Difficulty Rating: ${feedback.rating}/5`;
        }).join('\n');

        // Get Input Data
        const body = await request.json().catch(() => ({}));
        const locale = body.locale || 'en';

        // Get today's check-in (mood, sleep, sport type preference)
        const checkins = await query('SELECT * FROM daily_checkins WHERE user_id = ? AND date = ?', [session.id, today]);
        const checkin = (checkins as any[])[0] || {};

        // Parse equipment if available
        let equipmentList: string[] = [];
        try {
            equipmentList = JSON.parse(checkin.equipment || '[]');
        } catch { equipmentList = []; }

        // Analyze recent history to avoid repeating same muscle groups
        const recentMuscles = (historyLogs as any[]).slice(0, 3).map(log => {
            const workout = JSON.parse(log.workout_json || '{}');
            return workout.title || '';
        });

        // Determine what was trained recently to suggest different focus
        const recentFocus = recentMuscles.join(', ') || 'None tracked';

        // 2. Construct Prompt
        const languageName = locale === 'fr' ? 'French (Français)' : locale === 'es' ? 'Spanish (Español)' : 'English';

        // Get day of week for variety
        const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

        // Determine workout split based on sport preference
        const sportType = checkin.sport_type || 'general';
        const location = checkin.training_location || 'gym';

        const systemPrompt = `
LANGUAGE: Respond ONLY in ${languageName}. Every word must be in ${languageName}.

You are Coach Alex, an elite personal trainer with 15 years of experience. You're warm, encouraging, but also push people to their limits. You speak like a real human coach - casual, motivating, sometimes funny.

TODAY IS: ${dayOfWeek}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 YOUR CLIENT TODAY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Fitness Goal: ${profile.macros_goal || 'General fitness'}
• Activity Level: ${profile.activity_level || 'Moderate'}
• Any Restrictions: ${profile.dietary_restrictions || 'None mentioned'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 TODAY'S CHECK-IN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Sleep Last Night: ${checkin.sleep_hours || '?'} hours
• Energy Level: ${checkin.energy_level || 5}/10
• Current Mood: ${checkin.mood_score || 5}/10
• They Want To Do: ${sportType.toUpperCase()}
• Training At: ${location.toUpperCase()}
${location === 'home' && equipmentList.length > 0 ? `• Equipment Available: ${equipmentList.join(', ')}` : ''}
${checkin.notes ? `• Notes From Client: "${checkin.notes}"` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 RECENT TRAINING (Last 3 Sessions)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${history || 'This is their first session with you!'}

Recent workout types: ${recentFocus}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 YOUR MISSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **DON'T REPEAT** - Look at their recent workouts. If they did legs yesterday, DO NOT give them legs today. Vary the muscle groups.

2. **MATCH THEIR SPORT** - They chose ${sportType}. Design a workout that fits this:
   - gym = muscle building, compound lifts, isolation work
   - hiit = high intensity intervals, cardio bursts, minimal rest
   - yoga = flexibility, poses, breathing
   - running = running drills, speed work, conditioning
   - cycling = leg endurance, core stability
   - boxing = punches, footwork, cardio
   - swimming = pool-specific drills or dry-land equivalents
   - etc.

3. **RESPECT ENERGY** - If energy is low (1-4), give an easier session. If high (8-10), push them hard.

4. **BE HUMAN** - Your motivation should feel like a real coach talking, not a robot. Use their situation (sleep, mood, day of week) in your pep talk.

5. **SMART SPLITS** - Use proper training splits:
   - Push Day (chest, shoulders, triceps)
   - Pull Day (back, biceps)
   - Leg Day (quads, hamstrings, glutes, calves)
   - Upper Body
   - Core & Conditioning
   - Active Recovery / Mobility
   
   Pick the RIGHT split based on what they've done recently and what sport they chose.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 OUTPUT FORMAT (JSON ONLY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
    "motivation": "2-3 sentences, personal, reference their sleep/mood/goal, speak like a real coach",
    "workout": {
        "title": "Specific title like 'Push Power Session' or 'Leg Day Burner' - NOT 'Full Body'",
        "duration": "30-60 min",
        "difficulty": "Easy/Medium/Hard (based on their energy)",
        "exercises": [
            { "name": "Exercise Name", "sets": "3", "reps": "12", "rest": "60s" }
        ]
    },
    "recommendation": "One practical tip about nutrition, recovery, or mindset"
}

REMEMBER: 
- No generic "Full Body Workout" - be specific about muscle groups
- 5-8 exercises max
- Match the workout to their sport preference
- Sound human, not robotic
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
