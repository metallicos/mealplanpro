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

    // 1. Handle Locales
    let path = pathname;
    const locales = ['en', 'fr'];
    for (const locale of locales) {
        if (path.startsWith(`/${locale}/`) || path === `/${locale}`) {
            path = path.replace(new RegExp(`^/${locale}`), '') || '/';
            break;
        }
    }

    // Skip API routes from auth checks if they don't need it (optional)
    // But we usually want to protect /api routes too. 
    // However, for page protection, we care about the normalized path.

    const token = request.cookies.get('session')?.value;
    const payload = token ? await verifyToken(token) : null;

    // LOGIN or SIGNUP PAGE: Redirect authenticated users to dashboard
    // Normalized path check
    if (path === '/login' || path === '/signup') {
        if (payload) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        // Proceed to next-intl middleware
        return intlMiddleware(request);
    }

    // PROTECTED ROUTES:
    // Public: /, /login, /signup, /api/auth/* (already skipped above)
    // But note: /api routes shouldn't be redirected to /login usually, they should return 401. 
    // We'll keep logic simple for pages.

    const isPublic = path === '/' || path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/api/public');
    const isAdmin = path.startsWith('/admin');

    // Only redirect pages. For API, let them handle it or return 401? 
    // For now, consistent behavior:
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

    // Finally, run intl middleware
    return intlMiddleware(request);
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
