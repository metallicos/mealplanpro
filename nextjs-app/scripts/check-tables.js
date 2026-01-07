const { createClient } = require('@libsql/client');

const client = createClient({
    url: 'file:local.db',
});

async function main() {
    try {
        const result = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
        console.log('Tables:', result.rows.map(r => r.name));
    } catch (err) {
        console.error(err);
    }
}

main();
