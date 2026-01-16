
import nodemailer from 'nodemailer';
import { query } from './db';

interface SystemSettings {
    key: string;
    value: string;
}

export async function sendEmail(to: string, subject: string, html: string) {
    // 1. Fetch SMTP settings from DB
    const settings = await query<SystemSettings[]>('SELECT key, value FROM system_settings WHERE key LIKE "smtp_%"');
    const config: Record<string, string> = {};
    settings.forEach(row => {
        config[row.key] = row.value;
    });

    // 2. Check if SMTP is configured
    if (!config.smtp_host || !config.smtp_user || !config.smtp_pass) {
        console.warn('⚠️ SMTP not fully configured. Email not sent.');
        console.log(`
        ========================================
        📧 MOCK EMAIL (SMTP Missing)
        ----------------------------------------
        TO: ${to}
        SUBJECT: ${subject}
        ----------------------------------------
        HTML:
        ${html}
        ========================================
        `);
        return false;
    }

    // 3. Create Transporter
    const transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: parseInt(config.smtp_port || '587'),
        secure: config.smtp_secure === 'true', // true for 465, false for other ports
        auth: {
            user: config.smtp_user,
            pass: config.smtp_pass,
        },
    });

    // 4. Send Email
    try {
        const info = await transporter.sendMail({
            from: `"${config.smtp_from_name || 'Meal Plan Pro'}" <${config.smtp_from_email || config.smtp_user}>`,
            to,
            subject,
            html,
        });

        console.log('✅ Email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Failed to send email:', error);
        throw error;
    }
}
