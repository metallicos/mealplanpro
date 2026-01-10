import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all completed fasts for this user
        const logs = await query(
            `SELECT * FROM fasting_logs 
             WHERE user_id = ? AND end_time IS NOT NULL 
             ORDER BY start_time DESC 
             LIMIT 50`,
            [session.id]
        );

        // Calculate stats
        const completedFasts = logs as any[];

        // Calculate streak (consecutive days with completed fasts)
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const fastDates = new Set(
            completedFasts.map(f => {
                const d = new Date(f.start_time);
                return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            })
        );

        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            const dateKey = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
            if (fastDates.has(dateKey)) {
                streak++;
            } else if (i > 0) {
                break;
            }
        }

        // Calculate longest fast
        let longestFast = 0;
        completedFasts.forEach(f => {
            if (f.start_time && f.end_time) {
                const duration = (new Date(f.end_time).getTime() - new Date(f.start_time).getTime()) / (1000 * 60 * 60);
                if (duration > longestFast) longestFast = duration;
            }
        });

        // Calculate average fast
        let totalHours = 0;
        completedFasts.forEach(f => {
            if (f.start_time && f.end_time) {
                totalHours += (new Date(f.end_time).getTime() - new Date(f.start_time).getTime()) / (1000 * 60 * 60);
            }
        });
        const averageFast = completedFasts.length > 0 ? totalHours / completedFasts.length : 0;

        // Total fasts this week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const thisWeek = completedFasts.filter(f => new Date(f.start_time) >= oneWeekAgo).length;

        // Total fasts this month
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const thisMonth = completedFasts.filter(f => new Date(f.start_time) >= oneMonthAgo).length;

        return NextResponse.json({
            history: completedFasts.map(f => ({
                id: f.id,
                start_time: f.start_time,
                end_time: f.end_time,
                goal_hours: f.goal_hours || 16,
                duration_hours: f.start_time && f.end_time
                    ? (new Date(f.end_time).getTime() - new Date(f.start_time).getTime()) / (1000 * 60 * 60)
                    : 0,
                goal_achieved: f.start_time && f.end_time && f.goal_hours
                    ? (new Date(f.end_time).getTime() - new Date(f.start_time).getTime()) / (1000 * 60 * 60) >= f.goal_hours
                    : false
            })),
            stats: {
                totalFasts: completedFasts.length,
                streak,
                longestFast: Math.round(longestFast * 10) / 10,
                averageFast: Math.round(averageFast * 10) / 10,
                thisWeek,
                thisMonth
            }
        });

    } catch (error) {
        console.error('GET /api/v2/fasting/history error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
