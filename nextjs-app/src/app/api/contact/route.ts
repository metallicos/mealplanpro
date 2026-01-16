import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const { name, email, subject, message } = await request.json();

        if (!name || !email || !message) {
            return NextResponse.json({ error: 'Name, email, and message are required' }, { status: 400 });
        }

        // Save to database
        await query(`
            INSERT INTO contact_submissions (name, email, subject, message)
            VALUES (?, ?, ?, ?)
        `, [name, email, subject || 'general', message]);

        // In production, you would also send an email notification here
        console.log(`[Contact Form] New submission from ${name} (${email}): ${subject}`);

        return NextResponse.json({
            success: true,
            message: 'Thank you for your message. We will get back to you soon.'
        });

    } catch (error) {
        console.error('Contact form error:', error);
        return NextResponse.json({ error: 'Failed to submit message' }, { status: 500 });
    }
}
