import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// POST - Set locale cookie
export async function POST(request: Request) {
    try {
        const { locale } = await request.json();

        if (!locale || !['en', 'fr'].includes(locale)) {
            return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
        }

        const cookieStore = await cookies();
        cookieStore.set('locale', locale, {
            httpOnly: false, // Allow JS access for UI
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 365, // 1 year
            path: '/',
        });

        return NextResponse.json({ success: true, locale });
    } catch (error) {
        console.error('POST /api/locale error:', error);
        return NextResponse.json({ error: 'Failed to set locale' }, { status: 500 });
    }
}

// GET - Get current locale
export async function GET() {
    try {
        const cookieStore = await cookies();
        const locale = cookieStore.get('locale')?.value || 'en';
        return NextResponse.json({ locale });
    } catch (error) {
        return NextResponse.json({ locale: 'en' });
    }
}
