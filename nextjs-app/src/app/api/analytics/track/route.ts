import { NextRequest, NextResponse } from 'next/server';
import { trackPageView } from '@/lib/analytics';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { sessionId, pagePath, referrer } = body;

        if (!sessionId || !pagePath) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get user agent and IP
        const userAgent = request.headers.get('user-agent') || '';
        const forwardedFor = request.headers.get('x-forwarded-for');
        const ip = forwardedFor ? forwardedFor.split(',')[0].trim() :
            request.headers.get('x-real-ip') || '';

        // Get country from Cloudflare or Vercel headers if available
        const country = request.headers.get('cf-ipcountry') ||
            request.headers.get('x-vercel-ip-country') || '';

        // Get user ID from session if logged in
        let userId: number | undefined;
        const authHeader = request.headers.get('authorization');
        if (authHeader) {
            // Could decode JWT here to get user ID
            // For now, client can pass it
            userId = body.userId;
        }

        await trackPageView({
            sessionId,
            userId,
            pagePath,
            referrer,
            userAgent,
            ip,
            country
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Analytics tracking error:', error);
        return NextResponse.json({ error: 'Failed to track' }, { status: 500 });
    }
}
