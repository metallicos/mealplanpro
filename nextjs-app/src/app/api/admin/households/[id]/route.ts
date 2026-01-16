import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET single household
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const households = await query(`
            SELECT h.*, u.email as master_email, u.full_name as master_name
            FROM households h
            JOIN users u ON h.master_user_id = u.id
            WHERE h.id = ?
        `, [id]);

        if (!(households as any[]).length) {
            return NextResponse.json({ error: 'Household not found' }, { status: 404 });
        }

        return NextResponse.json((households as any[])[0]);
    } catch (error) {
        console.error('Get household error:', error);
        return NextResponse.json({ error: 'Failed to fetch household' }, { status: 500 });
    }
}

// PUT update household
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { name } = await request.json();

        await query('UPDATE households SET name = ? WHERE id = ?', [name, id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update household error:', error);
        return NextResponse.json({ error: 'Failed to update household' }, { status: 500 });
    }
}

// DELETE household (and optionally users)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Remove household_id from users in this household
        await query('UPDATE users SET household_id = NULL WHERE household_id = ?', [id]);
        // Delete household
        await query('DELETE FROM households WHERE id = ?', [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete household error:', error);
        return NextResponse.json({ error: 'Failed to delete household' }, { status: 500 });
    }
}
