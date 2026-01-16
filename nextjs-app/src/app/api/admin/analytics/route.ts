import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import {
    getDashboardStats,
    getTrafficChartData,
    getSubscriptionChartData,
    getTopPages,
    getDeviceStats
} from '@/lib/analytics';

export async function GET(request: NextRequest) {
    try {
        // Check admin auth
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;
        const payload = token ? await verifyToken(token) : null;

        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'dashboard';

        switch (type) {
            case 'dashboard':
                const stats = await getDashboardStats();
                return NextResponse.json(stats);

            case 'traffic-chart':
                const days = parseInt(searchParams.get('days') || '30');
                const trafficData = await getTrafficChartData(days);
                return NextResponse.json(trafficData);

            case 'subscription-chart':
                const months = parseInt(searchParams.get('months') || '6');
                const subData = await getSubscriptionChartData(months);
                return NextResponse.json(subData);

            case 'top-pages':
                const limit = parseInt(searchParams.get('limit') || '10');
                const topPages = await getTopPages(limit);
                return NextResponse.json(topPages);

            case 'devices':
                const devices = await getDeviceStats();
                return NextResponse.json(devices);

            default:
                return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }
    } catch (error) {
        console.error('Analytics API error:', error);
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
}
