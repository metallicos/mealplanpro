import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request: NextRequest) {
    const token = request.cookies.get('session')?.value;
    const { pathname } = request.nextUrl;

    // Skip static assets and API auth routes
    if (pathname.startsWith('/_next') || pathname === '/favicon.ico' || pathname.startsWith('/api/auth')) {
        return NextResponse.next();
    }

    // Check if user is authenticated
    const payload = token ? await verifyToken(token) : null;

    // LOGIN or SIGNUP PAGE: Redirect authenticated users to dashboard
    if (pathname === '/login' || pathname === '/signup') {
        if (payload) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        return NextResponse.next();
    }

    // PROTECTED ROUTES: Redirect unauthenticated users to login
    if (!payload && pathname !== '/') {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // ADMIN ROUTES: Only admin role can access
    if (pathname.startsWith('/admin') && payload.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
