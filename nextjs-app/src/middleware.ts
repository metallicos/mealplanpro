// SIMPLIFIED LOGIC:

const isPublic = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/api/public');
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
