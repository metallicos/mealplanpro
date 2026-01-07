const { createClient } = require('@libsql/client');

const client = createClient({
    url: 'file:local.db',
});

async function main() {
    try {
        const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('Tables:', tables.rows.map(r => r.name));

        const columns = await client.execute("PRAGMA table_info(user_profiles)");
        console.log('User Profiles Columns:', columns.rows.map(r => r.name));

        const recipesCount = await client.execute("SELECT COUNT(*) as count FROM recipes");
        console.log('Recipes Count:', recipesCount.rows[0].count);
    } catch (err) {
        console.error(err);
    }
}

main();

