import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Verify admin
        const cookieStore = await cookies();
        const token = cookieStore.get('session')?.value;
        const payload = token ? await verifyToken(token) : null;

        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { status } = await request.json();

        await query('UPDATE contact_submissions SET status = ? WHERE id = ?', [status, id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update contact error:', error);
        return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
    }
}
