/**
 * Analytics Library
 * Track page views, user sessions, and subscription events
 */

import { query } from './db';
import crypto from 'crypto';

// Hash IP for privacy
function hashIP(ip: string): string {
    return crypto.createHash('sha256').update(ip + process.env.ANALYTICS_SALT || 'salt').digest('hex').slice(0, 16);
}

// Detect device type from user agent
function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
    const ua = userAgent.toLowerCase();
    if (/mobile|android|iphone|ipod|blackberry|windows phone/.test(ua)) {
        if (/ipad|tablet/.test(ua)) return 'tablet';
        return 'mobile';
    }
    if (/ipad|tablet/.test(ua)) return 'tablet';
    return 'desktop';
}

// Extract browser from user agent
function getBrowser(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('edg')) return 'Edge';
    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('safari')) return 'Safari';
    if (ua.includes('opera') || ua.includes('opr')) return 'Opera';
    return 'Other';
}

export interface PageViewData {
    sessionId: string;
    userId?: number;
    pagePath: string;
    referrer?: string;
    userAgent: string;
    ip?: string;
    country?: string;
}

export async function trackPageView(data: PageViewData): Promise<void> {
    try {
        const deviceType = getDeviceType(data.userAgent);
        const browser = getBrowser(data.userAgent);
        const ipHash = data.ip ? hashIP(data.ip) : null;

        await query(`
            INSERT INTO page_views (session_id, user_id, page_path, referrer, user_agent, ip_hash, country, device_type, browser)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            data.sessionId,
            data.userId || null,
            data.pagePath,
            data.referrer || null,
            data.userAgent,
            ipHash,
            data.country || null,
            deviceType,
            browser
        ]);

        // Update daily stats
        await updateDailyStats(deviceType);
    } catch (error) {
        console.error('Failed to track page view:', error);
    }
}

async function updateDailyStats(deviceType: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    try {
        // Try to update existing row
        const result = await query(`
            UPDATE daily_stats 
            SET page_views = page_views + 1,
                mobile_visits = mobile_visits + ?,
                desktop_visits = desktop_visits + ?,
                tablet_visits = tablet_visits + ?,
                updated_at = datetime('now')
            WHERE date = ?
        `, [
            deviceType === 'mobile' ? 1 : 0,
            deviceType === 'desktop' ? 1 : 0,
            deviceType === 'tablet' ? 1 : 0,
            today
        ]);

        // If no row was updated, insert new one
        if ((result as any).rowsAffected === 0) {
            await query(`
                INSERT INTO daily_stats (date, page_views, mobile_visits, desktop_visits, tablet_visits)
                VALUES (?, 1, ?, ?, ?)
            `, [
                today,
                deviceType === 'mobile' ? 1 : 0,
                deviceType === 'desktop' ? 1 : 0,
                deviceType === 'tablet' ? 1 : 0
            ]);
        }
    } catch (error) {
        // Row might not exist, try insert
        try {
            await query(`
                INSERT OR REPLACE INTO daily_stats (date, page_views, mobile_visits, desktop_visits, tablet_visits)
                VALUES (?, 
                    COALESCE((SELECT page_views FROM daily_stats WHERE date = ?), 0) + 1,
                    COALESCE((SELECT mobile_visits FROM daily_stats WHERE date = ?), 0) + ?,
                    COALESCE((SELECT desktop_visits FROM daily_stats WHERE date = ?), 0) + ?,
                    COALESCE((SELECT tablet_visits FROM daily_stats WHERE date = ?), 0) + ?
                )
            `, [
                today, today, today,
                deviceType === 'mobile' ? 1 : 0,
                today, deviceType === 'desktop' ? 1 : 0,
                today, deviceType === 'tablet' ? 1 : 0
            ]);
        } catch (e) {
            console.error('Failed to update daily stats:', e);
        }
    }
}

// Subscription event types
export type SubscriptionEventType =
    | 'trial_started'
    | 'trial_ended'
    | 'subscribed'
    | 'renewed'
    | 'canceled'
    | 'churned'
    | 'reactivated';

export interface SubscriptionEventData {
    userId: number;
    eventType: SubscriptionEventType;
    subscriptionId?: number;
    paymentProvider?: string;
    amount?: number;
    currency?: string;
    metadata?: Record<string, any>;
}

export async function trackSubscriptionEvent(data: SubscriptionEventData): Promise<void> {
    try {
        await query(`
            INSERT INTO subscription_events (user_id, event_type, subscription_id, payment_provider, amount, currency, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            data.userId,
            data.eventType,
            data.subscriptionId || null,
            data.paymentProvider || null,
            data.amount || null,
            data.currency || 'USD',
            data.metadata ? JSON.stringify(data.metadata) : null
        ]);

        // Update monthly revenue if payment
        if (data.amount && data.amount > 0 && data.eventType === 'subscribed') {
            await updateMonthlyRevenue(data.amount, data.eventType);
        }
    } catch (error) {
        console.error('Failed to track subscription event:', error);
    }
}

async function updateMonthlyRevenue(amount: number, eventType: string): Promise<void> {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM

    try {
        await query(`
            INSERT INTO monthly_revenue (month, total_revenue, new_subscriptions, net_revenue)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(month) DO UPDATE SET
                total_revenue = total_revenue + ?,
                new_subscriptions = new_subscriptions + ?,
                net_revenue = net_revenue + ?,
                updated_at = datetime('now')
        `, [
            month, amount, 1, amount,
            amount, 1, amount
        ]);
    } catch (error) {
        console.error('Failed to update monthly revenue:', error);
    }
}

// Analytics queries for dashboard

export interface DashboardStats {
    today: {
        pageViews: number;
        uniqueVisitors: number;
        newUsers: number;
    };
    week: {
        pageViews: number;
        uniqueVisitors: number;
        newUsers: number;
        growth: number; // percentage vs last week
    };
    month: {
        pageViews: number;
        uniqueVisitors: number;
        newUsers: number;
    };
    subscriptions: {
        active: number;
        trial: number;
        newThisMonth: number;
        churnedThisMonth: number;
        mrr: number;
    };
}

export async function getDashboardStats(): Promise<DashboardStats> {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthStart = new Date().toISOString().slice(0, 7) + '-01';

    try {
        // Today's stats
        const todayStats = await query<{ page_views: number; unique_visitors: number }[]>(`
            SELECT 
                COUNT(*) as page_views,
                COUNT(DISTINCT session_id) as unique_visitors
            FROM page_views 
            WHERE date(created_at) = ?
        `, [today]);

        const todayNewUsers = await query<{ count: number }[]>(`
            SELECT COUNT(*) as count FROM users WHERE date(created_at) = ?
        `, [today]);

        // This week stats
        const weekStats = await query<{ page_views: number; unique_visitors: number }[]>(`
            SELECT 
                COUNT(*) as page_views,
                COUNT(DISTINCT session_id) as unique_visitors
            FROM page_views 
            WHERE date(created_at) >= ?
        `, [weekAgo]);

        const lastWeekStats = await query<{ page_views: number }[]>(`
            SELECT COUNT(*) as page_views
            FROM page_views 
            WHERE date(created_at) >= ? AND date(created_at) < ?
        `, [twoWeeksAgo, weekAgo]);

        const weekNewUsers = await query<{ count: number }[]>(`
            SELECT COUNT(*) as count FROM users WHERE date(created_at) >= ?
        `, [weekAgo]);

        // This month stats
        const monthStats = await query<{ page_views: number; unique_visitors: number }[]>(`
            SELECT 
                COUNT(*) as page_views,
                COUNT(DISTINCT session_id) as unique_visitors
            FROM page_views 
            WHERE date(created_at) >= ?
        `, [monthStart]);

        const monthNewUsers = await query<{ count: number }[]>(`
            SELECT COUNT(*) as count FROM users WHERE date(created_at) >= ?
        `, [monthStart]);

        // Subscription stats
        const activeSubscriptions = await query<{ count: number }[]>(`
            SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'
        `);

        const trialSubscriptions = await query<{ count: number }[]>(`
            SELECT COUNT(*) as count FROM subscriptions WHERE status = 'trialing'
        `);

        const newSubsThisMonth = await query<{ count: number }[]>(`
            SELECT COUNT(*) as count FROM subscription_events 
            WHERE event_type = 'subscribed' AND date(created_at) >= ?
        `, [monthStart]);

        const churnedThisMonth = await query<{ count: number }[]>(`
            SELECT COUNT(*) as count FROM subscription_events 
            WHERE event_type IN ('canceled', 'churned') AND date(created_at) >= ?
        `, [monthStart]);

        // Calculate week-over-week growth
        const thisWeekViews = weekStats[0]?.page_views || 0;
        const lastWeekViews = lastWeekStats[0]?.page_views || 1;
        const weekGrowth = Math.round(((thisWeekViews - lastWeekViews) / lastWeekViews) * 100);

        return {
            today: {
                pageViews: todayStats[0]?.page_views || 0,
                uniqueVisitors: todayStats[0]?.unique_visitors || 0,
                newUsers: todayNewUsers[0]?.count || 0
            },
            week: {
                pageViews: weekStats[0]?.page_views || 0,
                uniqueVisitors: weekStats[0]?.unique_visitors || 0,
                newUsers: weekNewUsers[0]?.count || 0,
                growth: weekGrowth
            },
            month: {
                pageViews: monthStats[0]?.page_views || 0,
                uniqueVisitors: monthStats[0]?.unique_visitors || 0,
                newUsers: monthNewUsers[0]?.count || 0
            },
            subscriptions: {
                active: activeSubscriptions[0]?.count || 0,
                trial: trialSubscriptions[0]?.count || 0,
                newThisMonth: newSubsThisMonth[0]?.count || 0,
                churnedThisMonth: churnedThisMonth[0]?.count || 0,
                mrr: 0 // Will calculate from payment data
            }
        };
    } catch (error) {
        console.error('Failed to get dashboard stats:', error);
        return {
            today: { pageViews: 0, uniqueVisitors: 0, newUsers: 0 },
            week: { pageViews: 0, uniqueVisitors: 0, newUsers: 0, growth: 0 },
            month: { pageViews: 0, uniqueVisitors: 0, newUsers: 0 },
            subscriptions: { active: 0, trial: 0, newThisMonth: 0, churnedThisMonth: 0, mrr: 0 }
        };
    }
}

export interface ChartData {
    labels: string[];
    pageViews: number[];
    visitors: number[];
    newUsers: number[];
}

export async function getTrafficChartData(days: number = 30): Promise<ChartData> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
        const data = await query<{ date: string; page_views: number; unique_visitors: number }[]>(`
            SELECT 
                date(created_at) as date,
                COUNT(*) as page_views,
                COUNT(DISTINCT session_id) as unique_visitors
            FROM page_views 
            WHERE date(created_at) >= ?
            GROUP BY date(created_at)
            ORDER BY date ASC
        `, [startDate]);

        const userSignups = await query<{ date: string; count: number }[]>(`
            SELECT date(created_at) as date, COUNT(*) as count
            FROM users
            WHERE date(created_at) >= ?
            GROUP BY date(created_at)
            ORDER BY date ASC
        `, [startDate]);

        // Build complete date range
        const labels: string[] = [];
        const pageViews: number[] = [];
        const visitors: number[] = [];
        const newUsers: number[] = [];

        const dataMap = new Map(data.map(d => [d.date, d]));
        const signupMap = new Map(userSignups.map(d => [d.date, d.count]));

        for (let i = 0; i < days; i++) {
            const date = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000)
                .toISOString().split('T')[0];
            labels.push(date);

            const dayData = dataMap.get(date);
            pageViews.push(dayData?.page_views || 0);
            visitors.push(dayData?.unique_visitors || 0);
            newUsers.push(signupMap.get(date) || 0);
        }

        return { labels, pageViews, visitors, newUsers };
    } catch (error) {
        console.error('Failed to get chart data:', error);
        return { labels: [], pageViews: [], visitors: [], newUsers: [] };
    }
}

export interface SubscriptionChartData {
    labels: string[];
    newSubscriptions: number[];
    cancellations: number[];
    revenue: number[];
}

export async function getSubscriptionChartData(months: number = 6): Promise<SubscriptionChartData> {
    try {
        const labels: string[] = [];
        const newSubscriptions: number[] = [];
        const cancellations: number[] = [];
        const revenue: number[] = [];

        for (let i = months - 1; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const month = date.toISOString().slice(0, 7);
            labels.push(month);

            const newSubs = await query<{ count: number }[]>(`
                SELECT COUNT(*) as count FROM subscription_events 
                WHERE event_type = 'subscribed' AND strftime('%Y-%m', created_at) = ?
            `, [month]);

            const canceled = await query<{ count: number }[]>(`
                SELECT COUNT(*) as count FROM subscription_events 
                WHERE event_type IN ('canceled', 'churned') AND strftime('%Y-%m', created_at) = ?
            `, [month]);

            const monthRevenue = await query<{ total: number }[]>(`
                SELECT COALESCE(SUM(amount), 0) as total FROM subscription_events 
                WHERE event_type = 'subscribed' AND strftime('%Y-%m', created_at) = ?
            `, [month]);

            newSubscriptions.push(newSubs[0]?.count || 0);
            cancellations.push(canceled[0]?.count || 0);
            revenue.push(monthRevenue[0]?.total || 0);
        }

        return { labels, newSubscriptions, cancellations, revenue };
    } catch (error) {
        console.error('Failed to get subscription chart data:', error);
        return { labels: [], newSubscriptions: [], cancellations: [], revenue: [] };
    }
}

export interface TopPagesData {
    path: string;
    views: number;
    percentage: number;
}

export async function getTopPages(limit: number = 10): Promise<TopPagesData[]> {
    try {
        const total = await query<{ count: number }[]>(`
            SELECT COUNT(*) as count FROM page_views 
            WHERE date(created_at) >= date('now', '-30 days')
        `);

        const pages = await query<{ page_path: string; views: number }[]>(`
            SELECT page_path, COUNT(*) as views
            FROM page_views 
            WHERE date(created_at) >= date('now', '-30 days')
            GROUP BY page_path
            ORDER BY views DESC
            LIMIT ?
        `, [limit]);

        const totalViews = total[0]?.count || 1;

        return pages.map(p => ({
            path: p.page_path,
            views: p.views,
            percentage: Math.round((p.views / totalViews) * 100)
        }));
    } catch (error) {
        console.error('Failed to get top pages:', error);
        return [];
    }
}

export interface DeviceStats {
    mobile: number;
    desktop: number;
    tablet: number;
}

export async function getDeviceStats(): Promise<DeviceStats> {
    try {
        const stats = await query<{ device_type: string; count: number }[]>(`
            SELECT device_type, COUNT(*) as count
            FROM page_views 
            WHERE date(created_at) >= date('now', '-30 days')
            GROUP BY device_type
        `);

        const result: DeviceStats = { mobile: 0, desktop: 0, tablet: 0 };
        stats.forEach(s => {
            if (s.device_type === 'mobile') result.mobile = s.count;
            if (s.device_type === 'desktop') result.desktop = s.count;
            if (s.device_type === 'tablet') result.tablet = s.count;
        });

        return result;
    } catch (error) {
        console.error('Failed to get device stats:', error);
        return { mobile: 0, desktop: 0, tablet: 0 };
    }
}
