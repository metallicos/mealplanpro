import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
    const auth = await getSession();
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { post_id } = await request.json();

        if (!post_id) {
            return NextResponse.json({ error: 'Post ID required' }, { status: 400 });
        }

        // Check if already liked
        const existing = await query(
            'SELECT 1 FROM forum_likes WHERE user_id = ? AND post_id = ?',
            [auth.id, post_id]
        );

        let liked = false;

        if ((existing as any[]).length > 0) {
            // Unlike
            await query('DELETE FROM forum_likes WHERE user_id = ? AND post_id = ?', [auth.id, post_id]);
            await query('UPDATE forum_posts SET likes = likes - 1 WHERE id = ?', [post_id]);
            liked = false;
        } else {
            // Like
            await query('INSERT INTO forum_likes (user_id, post_id) VALUES (?, ?)', [auth.id, post_id]);
            await query('UPDATE forum_posts SET likes = likes + 1 WHERE id = ?', [post_id]);
            liked = true;
        }

        // Get updated count
        const counts = await query('SELECT likes FROM forum_posts WHERE id = ?', [post_id]);
        const newCount = (counts as any[])[0]?.likes || 0;

        return NextResponse.json({ liked, likes: newCount });

    } catch (error) {
        console.error('Like error:', error);
        return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 });
    }
}
