import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const posts = await query(`
            SELECT p.*, u.full_name as author_name
            FROM forum_posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
        `, [id]);

        if (!posts || (posts as any[]).length === 0) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        const post = (posts as any[])[0];

        // Get comments
        const comments = await query(`
            SELECT c.*, u.full_name as author_name
            FROM forum_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
        `, [id]);

        return NextResponse.json({ post, comments });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
    }
}
