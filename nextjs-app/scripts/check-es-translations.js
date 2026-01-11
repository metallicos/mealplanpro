
const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function checkTranslations() {
    try {
        const result = await client.execute("SELECT COUNT(*) as count FROM recipe_translations WHERE language_code = 'es'");
        console.log('ES Translations count:', result.rows[0].count);

        // Show one example
        const example = await client.execute("SELECT * FROM recipe_translations WHERE language_code = 'es' LIMIT 1");
        if (example.rows.length > 0) {
            console.log('Example translation:', example.rows[0].title);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

checkTranslations();
