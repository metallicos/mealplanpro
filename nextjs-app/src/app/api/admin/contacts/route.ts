import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
    try {
        // Verify admin
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;
        const payload = token ? await verifyToken(token) : null;

        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const contacts = await query(`
            SELECT id, name, email, subject, message, status, created_at
            FROM contact_submissions
            ORDER BY 
                CASE WHEN status = 'new' THEN 0 ELSE 1 END,
                created_at DESC
        `);

        return NextResponse.json(contacts);
    } catch (error) {
        console.error('Admin contacts error:', error);
        return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
    }
}
