import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';
import createMiddleware from 'next-intl/middleware';

const intlMiddleware = createMiddleware({
    locales: ['en', 'fr'],
    defaultLocale: 'en'
});

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip static assets and API auth routes
    if (pathname.startsWith('/_next') || pathname === '/favicon.ico' || pathname.startsWith('/api/auth')) {
        return NextResponse.next();
    }

    // 1. Run Intl Middleware to handle locale
    // We only need it for pages, not APIs ideally, but next-intl usually handles both or we exclude api.
    // However, our API routes are /api/... and likely don't need locale prefixes, but components might use headers.
    // For now, let's run it.

    // Note: next-intl middleware returns a response. We might need to capture it and then run auth.
    // But auth might redirect.
    // If auth redirects, we return that.
    // If auth says "next", we return intlMiddleware(request).

    const token = request.cookies.get('session')?.value;
    const payload = token ? await verifyToken(token) : null;

    // LOGIN or SIGNUP PAGE: Redirect authenticated users to dashboard
    if (pathname === '/login' || pathname === '/signup') {
        if (payload) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        // If not logged in, proceed. But we need to run intl middleware to ensure locale is set?
        // If we just return next(), we miss locale handling.
        return intlMiddleware(request);
    }

    // PROTECTED ROUTES: Redirect unauthenticated users to login
    // Exclude root '/' because it's public now
    if (!payload && pathname !== '/' && !pathname.startsWith('/login') && !pathname.startsWith('/signup')) {
        // Allow public access to /
    } else if (!payload && pathname !== '/') {
        // This block logic is getting messy. Let's simplify.
    }

    // SIMPLIFIED LOGIC:

    const isPublic = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup');
    const isAdmin = pathname.startsWith('/admin');

    if (!isPublic && !payload) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (isAdmin && payload?.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // Finally, run intl middleware
    return intlMiddleware(request);
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
