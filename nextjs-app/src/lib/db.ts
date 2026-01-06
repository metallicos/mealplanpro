import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'meal_plan_app',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

export default pool;

export async function query<T>(sql: string, params?: unknown[]): Promise<T> {
    const [rows] = await pool.execute(sql, params);
    return rows as T;
}
