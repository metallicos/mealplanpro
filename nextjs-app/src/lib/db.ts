import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({
    url,
    authToken,
});

export default client;

export async function query<T>(sql: string, params: any[] = []): Promise<T> {
    try {
        // Handle MySQL vs SQLite syntax differences if any remain
        // But mainly just execute
        const result = await client.execute({ sql, args: params });

        // Return rows properly cast
        return result.rows as unknown as T;
    } catch (error) {
        console.error('Database Error:', error);
        throw error;
    }
}
