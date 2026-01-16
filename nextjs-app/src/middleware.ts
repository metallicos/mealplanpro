import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip static assets and API auth routes
    if (pathname.startsWith('/_next') || pathname === '/favicon.ico' || pathname.startsWith('/api/auth')) {
        return NextResponse.next();
    }

    const token = request.cookies.get('session')?.value;
    const payload = token ? await verifyToken(token) : null;

    // SIMPLIFIED LOGIC:

    const isPublic = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password') || pathname.startsWith('/privacy-policy') || pathname.startsWith('/terms') || pathname.startsWith('/contact') || pathname.startsWith('/api/public') || pathname === '/api/locale';
    const isAdmin = pathname.startsWith('/admin');

    if (!isPublic && !payload) {
        // If it's an API request, return 401 instead of redirecting
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (isAdmin && payload?.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
