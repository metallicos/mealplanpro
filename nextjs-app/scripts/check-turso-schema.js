const { createClient } = require('@libsql/client');

const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node scripts/check-turso-schema.js <URL> <TOKEN>');
    process.exit(1);
}

const url = args[0];
const authToken = args[1];

console.log('Target Database:', url);

const client = createClient({
    url,
    authToken,
});

async function check() {
    try {
        const res = await client.execute("PRAGMA table_info(user_profiles)");
        const columns = res.rows.map(r => r.name);
        console.log('Columns in user_profiles:', columns.join(', '));

        const required = ['diet_mode', 'neck', 'waist', 'hip'];
        const missing = required.filter(c => !columns.includes(c));

        if (missing.length === 0) {
            console.log('SUCCESS: All required columns (diet_mode, neck, waist, hip) are present in user_profiles.');
        } else {
            console.log('FAILURE: Missing columns in user_profiles:', missing.join(', '));
        }

        const resForum = await client.execute("PRAGMA table_info(forum_posts)");
        const columnsForum = resForum.rows.map(r => r.name);
        if (columnsForum.includes('image_url')) {
            console.log('SUCCESS: image_url is present in forum_posts.');
        } else {
            console.log('FAILURE: image_url is missing in forum_posts.');
        }

    } catch (e) {
        console.error('Error querying DB:', e.message);
    }
}
check();
