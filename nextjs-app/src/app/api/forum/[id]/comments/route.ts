import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await getSession();
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        const { content, image_url } = await request.json();

        if (!content) {
            return NextResponse.json({ error: 'Content required' }, { status: 400 });
        }

        await query(`
            INSERT INTO forum_comments (post_id, user_id, content, image_url)
            VALUES (?, ?, ?, ?)
        `, [id, auth.id, content, image_url || null]);

        return NextResponse.json({ message: 'Comment added' });
    } catch (error) {
        console.error('Comment error:', error);
        return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
    }
}
