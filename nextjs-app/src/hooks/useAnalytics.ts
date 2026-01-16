'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// Generate a session ID that persists for the browser session
function getSessionId(): string {
    if (typeof window === 'undefined') return '';

    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
}

interface UseAnalyticsOptions {
    userId?: number;
    enabled?: boolean;
}

export function useAnalytics(options: UseAnalyticsOptions = {}) {
    const { userId, enabled = true } = options;
    const pathname = usePathname();
    const lastTrackedPath = useRef<string>('');

    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return;

        // Don't track if same path (prevents double tracking)
        if (pathname === lastTrackedPath.current) return;
        lastTrackedPath.current = pathname;

        // Don't track admin pages
        if (pathname.startsWith('/admin')) return;

        // Don't track API routes
        if (pathname.startsWith('/api')) return;

        const sessionId = getSessionId();
        const referrer = document.referrer;

        // Fire and forget - don't wait for response
        fetch('/api/analytics/track', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId,
                userId,
                pagePath: pathname,
                referrer,
            }),
        }).catch(() => {
            // Silently fail - analytics shouldn't break the app
        });
    }, [pathname, userId, enabled]);
}

// Standalone function for manual tracking
export async function trackEvent(eventName: string, properties?: Record<string, any>) {
    if (typeof window === 'undefined') return;

    const sessionId = getSessionId();

    try {
        await fetch('/api/analytics/track', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId,
                pagePath: `_event:${eventName}`,
                referrer: JSON.stringify(properties || {}),
            }),
        });
    } catch {
        // Silently fail
    }
}
