import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET - Fetch Single Post
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const postId = id;
        const posts = await query(`
            SELECT p.*, u.full_name as author_name, u.avatar_url as author_avatar,
            (SELECT COUNT(*) FROM forum_comments c WHERE c.post_id = p.id) as comment_count
            FROM forum_posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE p.id = ?
        `, [postId]);

        if ((posts as any[]).length === 0) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        const post = (posts as any[])[0];

        // Fetch comments
        const comments = await query(`
            SELECT c.*, u.full_name as author_name, u.avatar_url as author_avatar
            FROM forum_comments c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
        `, [postId]);

        return NextResponse.json({ post, comments });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
    }
}

// PUT - Update Post
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const auth = await getSession();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { title, content, image_url } = await request.json();
        const postId = id;

        // Verify ownership
        const posts = await query('SELECT user_id FROM forum_posts WHERE id = ?', [postId]);
        if ((posts as any[]).length === 0) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

        if ((posts as any[])[0].user_id !== auth.id && auth.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await query(
            'UPDATE forum_posts SET title = ?, content = ?, image_url = ? WHERE id = ?',
            [title, content, image_url || null, postId]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
    }
}

// DELETE - Delete Post
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const auth = await getSession();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const postId = id;

        // Verify ownership
        const posts = await query('SELECT user_id FROM forum_posts WHERE id = ?', [postId]);
        if ((posts as any[]).length === 0) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

        if ((posts as any[])[0].user_id !== auth.id && auth.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await query('DELETE FROM forum_posts WHERE id = ?', [postId]);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
    }
}
