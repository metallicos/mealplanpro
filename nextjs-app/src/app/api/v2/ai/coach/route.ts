import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.0-flash-lite-preview-02-05';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Get User Context (Profile + Recent Logs)
        const profiles = await query('SELECT * FROM user_profiles WHERE user_id = ?', [session.id]);
        const profile = (profiles as any[])[0] || {};

        // Get today's check-in (mood, sleep)
        const today = new Date().toISOString().split('T')[0];
        const checkins = await query('SELECT * FROM daily_checkins WHERE user_id = ? AND date = ?', [session.id, today]);
        const checkin = (checkins as any[])[0] || {};

        // 2. Construct Prompt
        const systemPrompt = `
        You are an elite, empathetic fitness coach for the application "MealPlan Pro".
        Your goal is to generate a personalized daily workout plan and a short motivational speech based on the user's current state.

        User Profile:
        - Fitness Level: ${profile.activity_level || 'Intermediate'}
        - Goals: ${JSON.stringify(profile.macros_goal) || 'General Health'}
        - Injuries/Restrictions: ${profile.dietary_restrictions || 'None'}
        
        Status Today:
        - Sleep: ${checkin.sleep_hours || 'Unknown'} hours
        - Mood: ${checkin.mood_score || 5}/10
        - Energy: ${checkin.energy_level || 5}/10
        - Notes: ${checkin.notes || 'None'}

        Requirements:
        1. **Motivational Speech:** Short, human-like, referencing their specific situation (e.g., if bad sleep, be encouraging and suggest lighter load).
        2. **Workout:** 3 options (Cardio, Strength, Mobility/Recovery). Detailed but concise exercises.
        3. **Format:** RETURN ONLY RAW JSON. No markdown backticks.
        
        JSON Structure:
        {
            "motivation": "string",
            "workouts": [
                { "type": "Cardio", "duration": "20 min", "exercises": ["..."] },
                { "type": "Strength", "duration": "45 min", "exercises": ["..."] },
                { "type": "Mobility", "duration": "15 min", "exercises": ["..."] }
            ],
            "recommendation": "Based on your sleep, we recommend option..."
        }
        `;

        // 3. Call Gemini API
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }]
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('Gemini API Error:', err);
            if (response.status === 429) {
                return NextResponse.json({
                    error: 'My energy is low (Rate Limit)! Please give me a moment to recharge.'
                }, { status: 429 });
            }
            throw new Error('AI Service Unavailable');
        }

        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;

        // Clean markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(jsonStr);

        return NextResponse.json(result);

    } catch (error) {
        console.error('AI Coach API Error:', error);
        return NextResponse.json({ error: 'Failed to generate plan' }, { status: 500 });
    }
}
