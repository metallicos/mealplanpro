#!/usr/bin/env npx tsx
/**
 * Create Admin User Script
 * 
 * Usage:
 *   npx tsx scripts/create-admin.ts <email> <password> <full_name>
 * 
 * Example:
 *   npx tsx scripts/create-admin.ts admin@example.com secretpass123 "Admin User"
 */

import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function createAdmin() {
    const args = process.argv.slice(2);

    if (args.length < 3) {
        console.log('\n🔧 Create Admin User Script\n');
        console.log('Usage:');
        console.log('  npx tsx scripts/create-admin.ts <email> <password> <full_name>\n');
        console.log('Example:');
        console.log('  npx tsx scripts/create-admin.ts admin@example.com secret123 "Admin User"\n');
        process.exit(1);
    }

    const [email, password, fullName] = args;

    console.log('\n🔐 Creating admin user...\n');
    console.log(`   Email: ${email}`);
    console.log(`   Name:  ${fullName}`);
    console.log(`   DB:    ${url.includes('@') ? url.replace(/:[^:@]+@/, ':***@') : url}\n`);

    try {
        // Check if user exists
        const existing = await client.execute({
            sql: 'SELECT id, role FROM users WHERE email = ?',
            args: [email.toLowerCase()]
        });

        if (existing.rows.length > 0) {
            const user = existing.rows[0];
            if (user.role === 'admin') {
                console.log('⚠️  User already exists and is already an admin.\n');
            } else {
                // Upgrade to admin
                await client.execute({
                    sql: 'UPDATE users SET role = ? WHERE email = ?',
                    args: ['admin', email.toLowerCase()]
                });
                console.log(`✅ User upgraded to admin role!\n`);
            }
            process.exit(0);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user with admin role
        const result = await client.execute({
            sql: `INSERT INTO users (email, password_hash, full_name, role, terms_accepted_at) 
                  VALUES (?, ?, ?, 'admin', ?) RETURNING id`,
            args: [email.toLowerCase(), hashedPassword, fullName, new Date().toISOString()]
        });

        const userId = result.rows[0]?.id;

        // Create household for admin
        await client.execute({
            sql: 'INSERT INTO households (master_user_id, name) VALUES (?, ?)',
            args: [userId, `${fullName}'s Household`]
        });

        // Get household ID and update user
        const household = await client.execute({
            sql: 'SELECT id FROM households WHERE master_user_id = ?',
            args: [userId]
        });

        await client.execute({
            sql: 'UPDATE users SET household_id = ? WHERE id = ?',
            args: [household.rows[0]?.id, userId]
        });

        // Create profile
        await client.execute({
            sql: 'INSERT INTO user_profiles (user_id, gender) VALUES (?, ?)',
            args: [userId, 'male']
        });

        console.log(`✅ Admin user created successfully!`);
        console.log(`\n   User ID: ${userId}`);
        console.log(`   Login:   ${email}`);
        console.log(`   Role:    admin\n`);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }

    process.exit(0);
}

createAdmin();
