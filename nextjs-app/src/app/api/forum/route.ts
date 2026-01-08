import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q');
        const sort = searchParams.get('sort') || 'latest'; // latest, top
        const userId = searchParams.get('user_id');

        let sql = `
            SELECT p.*, u.full_name as author_name, up.avatar_url as author_avatar,
            (SELECT COUNT(*) FROM forum_comments c WHERE c.post_id = p.id) as comment_count
            FROM forum_posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id 
        `;

        const conditions = [];
        const params = [];

        if (q) {
            conditions.push('(p.title LIKE ? OR p.content LIKE ?)');
            params.push(`%${q}%`, `%${q}%`);
        }

        if (userId) {
            conditions.push('p.user_id = ?');
            params.push(userId);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        if (sort === 'top') {
            sql += ' ORDER BY p.likes DESC, p.created_at DESC';
        } else {
            sql += ' ORDER BY p.created_at DESC';
        }

        sql += ' LIMIT 50';

        const posts = await query(sql, params);

        // Check "liked by me" if logged in (Client handles this via optimized separate call or here if session avbl)
        // For simplicity, we just return posts. Frontend checks 'like' status if needed via stored state or check.
        // Better: client can fetch "my likes" separately or we inject it here if session exists.

        return NextResponse.json({ posts });
    } catch (error) {
        console.error('Forum fetch error:', error);
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
