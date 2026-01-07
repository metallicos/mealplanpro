import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const posts = await query(`
            SELECT p.*, u.full_name as author_name, 
            (SELECT COUNT(*) FROM forum_comments c WHERE c.post_id = p.id) as comment_count
            FROM forum_posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
            LIMIT 50
        `);
        return NextResponse.json({ posts });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const auth = await getSession();
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { title, content, image_url } = await request.json();

        if (!title || !content) {
            return NextResponse.json({ error: 'Title and content required' }, { status: 400 });
        }

        const result = await query(`
            INSERT INTO forum_posts (user_id, title, content, image_url)
            VALUES (?, ?, ?, ?)
            RETURNING id
        `, [auth.id, title, content, image_url || null]);

        // SQLite returning support
        const newPostId = (result as any[])[0]?.id;

        return NextResponse.json({ id: newPostId, message: 'Post created' });
    } catch (error) {
        console.error('Create post error:', error);
        return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }
}
