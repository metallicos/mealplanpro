import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET - Fetch SMTP settings
export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const settings = await query<any[]>('SELECT key, value FROM system_settings WHERE key LIKE "smtp_%"');

        // Convert array to object
        const config: Record<string, string> = {};
        settings.forEach(row => {
            config[row.key] = row.value;
        });

        // Default values if empty
        return NextResponse.json({
            smtp_host: config.smtp_host || '',
            smtp_port: config.smtp_port || '587',
            smtp_user: config.smtp_user || '',
            smtp_pass: config.smtp_pass || '', // In real app, might want to mask this
            smtp_secure: config.smtp_secure === 'true',
            smtp_from_email: config.smtp_from_email || '',
            smtp_from_name: config.smtp_from_name || 'Meal Plan Pro'
        });

    } catch (error) {
        console.error('GET /api/admin/settings error:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

// POST - Update SMTP settings
export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Whitelist allowed keys
        const allowedKeys = [
            'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass',
            'smtp_secure', 'smtp_from_email', 'smtp_from_name'
        ];

        for (const key of allowedKeys) {
            if (body[key] !== undefined) {
                // Upsert logic (SQLite standard)
                await query(
                    `INSERT INTO system_settings (key, value) VALUES (?, ?) 
                     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
                    [key, String(body[key])]
                );
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('POST /api/admin/settings error:', error);
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
