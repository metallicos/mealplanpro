import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const SECRET_KEY = process.env.JWT_SECRET || 'meal-plan-super-secret-key-change-in-prod';
const key = new TextEncoder().encode(SECRET_KEY);

export interface SessionPayload {
    id: number;
    email: string;
    role: 'admin' | 'master' | 'member';
    householdId: number | null;
}

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
}

/**
 * Compare plain password with hash
 */
export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
    return await bcrypt.compare(plain, hashed);
}

/**
 * Sign a JWT token
 */
export async function signToken(payload: SessionPayload): Promise<string> {
    return await new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(key);
}

/**
 * Verify a JWT token
 */
export async function verifyToken(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, key);
        return payload as unknown as SessionPayload;
    } catch (error) {
        return null;
    }
}

/**
 * Get current session from cookies
 */
export async function getSession(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    if (!token) return null;
    return await verifyToken(token);
}

/**
 * Set session cookie
 */
export async function setSession(token: string) {
    const cookieStore = await cookies();
    cookieStore.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
    });
}

/**
 * Clear session cookie
 */
export async function clearSession() {
    const cookieStore = await cookies();
    cookieStore.delete('session');
}
