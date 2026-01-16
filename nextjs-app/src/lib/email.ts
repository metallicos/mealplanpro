
// Mock Email Service
export async function sendEmail(to: string, subject: string, html: string) {
    console.log(`
    ========================================
    📧 MOCK EMAIL SENT
    ----------------------------------------
    TO: ${to}
    SUBJECT: ${subject}
    ----------------------------------------
    HTML:
    ${html}
    ========================================
    `);
    return true;
}
