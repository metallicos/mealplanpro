/**
 * Subscription Management Library
 * Handles subscription status, trial management, and feature usage limits
 */

import { query } from './db';

// Types
export interface Subscription {
    id: number;
    user_id: number;
    payment_provider: string | null;
    provider_customer_id: string | null;
    provider_subscription_id: string | null;
    status: 'trialing' | 'active' | 'canceled' | 'past_due' | 'free';
    plan: 'free' | 'premium';
    trial_start: string | null;
    trial_end: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: number;
    created_at: string;
    updated_at: string;
}

export interface UsageCheck {
    allowed: boolean;
    remaining: number;
    limit: number;
    isPremium: boolean;
    isTrialing: boolean;
    trialDaysRemaining: number;
    upgradeRequired: boolean;
}

// Feature limits for free users
const FEATURE_LIMITS = {
    coach: { limit: 2, period: 'daily' },      // 2 per day
    smart_plan: { limit: 2, period: 'weekly' } // 2 per week
} as const;

type FeatureType = keyof typeof FEATURE_LIMITS;

/**
 * Get user's subscription record
 */
export async function getSubscription(userId: number): Promise<Subscription | null> {
    const results = await query<Subscription[]>(
        'SELECT * FROM subscriptions WHERE user_id = ?',
        [userId]
    );
    return results[0] || null;
}

/**
 * Check if user has active premium access (paid or trial)
 */
export async function isPremium(userId: number): Promise<boolean> {
    const sub = await getSubscription(userId);
    if (!sub) return false;

    // Active paid subscription
    if (sub.status === 'active' && sub.plan === 'premium') {
        return true;
    }

    // Active trial (not expired)
    if (sub.status === 'trialing' && sub.trial_end) {
        const trialEnd = new Date(sub.trial_end);
        return trialEnd > new Date();
    }

    return false;
}

/**
 * Check if user is currently in trial period
 */
export async function isInTrial(userId: number): Promise<boolean> {
    const sub = await getSubscription(userId);
    if (!sub || sub.status !== 'trialing') return false;

    if (sub.trial_end) {
        const trialEnd = new Date(sub.trial_end);
        return trialEnd > new Date();
    }

    return false;
}

/**
 * Get remaining trial days (0 if not in trial or expired)
 */
export async function getTrialDaysRemaining(userId: number): Promise<number> {
    const sub = await getSubscription(userId);
    if (!sub || sub.status !== 'trialing' || !sub.trial_end) return 0;

    const trialEnd = new Date(sub.trial_end);
    const now = new Date();

    if (trialEnd <= now) return 0;

    const diffMs = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
}

/**
 * Get the current period string for usage tracking
 */
function getCurrentPeriod(periodType: 'daily' | 'weekly'): string {
    const now = new Date();

    if (periodType === 'daily') {
        return now.toISOString().split('T')[0]; // YYYY-MM-DD
    } else {
        // Weekly: YYYY-WW format
        const year = now.getFullYear();
        const startOfYear = new Date(year, 0, 1);
        const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
        return `${year}-W${week.toString().padStart(2, '0')}`;
    }
}

/**
 * Get current usage count for a feature
 */
async function getUsageCount(userId: number, feature: FeatureType): Promise<number> {
    const periodType = FEATURE_LIMITS[feature].period;
    const period = getCurrentPeriod(periodType);

    const results = await query<{ count: number }[]>(
        'SELECT count FROM feature_usage WHERE user_id = ? AND feature = ? AND period = ?',
        [userId, feature, period]
    );

    return results[0]?.count || 0;
}

/**
 * Check if user can use a feature (respects limits for free users)
 */
export async function checkUsageLimit(userId: number, feature: FeatureType): Promise<UsageCheck> {
    const sub = await getSubscription(userId);
    const hasPremium = await isPremium(userId);
    const inTrial = await isInTrial(userId);
    const trialDays = await getTrialDaysRemaining(userId);

    // Premium or trial users have unlimited access
    if (hasPremium) {
        return {
            allowed: true,
            remaining: Infinity,
            limit: Infinity,
            isPremium: !inTrial,
            isTrialing: inTrial,
            trialDaysRemaining: trialDays,
            upgradeRequired: false
        };
    }

    // Free user - check limits
    const limit = FEATURE_LIMITS[feature].limit;
    const currentUsage = await getUsageCount(userId, feature);
    const remaining = Math.max(0, limit - currentUsage);

    return {
        allowed: remaining > 0,
        remaining,
        limit,
        isPremium: false,
        isTrialing: false,
        trialDaysRemaining: 0,
        upgradeRequired: remaining === 0
    };
}

/**
 * Increment usage count for a feature
 */
export async function incrementUsage(userId: number, feature: FeatureType): Promise<void> {
    const periodType = FEATURE_LIMITS[feature].period;
    const period = getCurrentPeriod(periodType);

    await query(
        `INSERT INTO feature_usage (user_id, feature, period, count)
         VALUES (?, ?, ?, 1)
         ON CONFLICT(user_id, feature, period) 
         DO UPDATE SET count = count + 1, updated_at = CURRENT_TIMESTAMP`,
        [userId, feature, period]
    );
}

/**
 * Create a new subscription with trial period
 */
export async function createTrialSubscription(userId: number, trialDays: number = 14): Promise<Subscription> {
    const now = new Date();
    const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const result = await query<{ id: number }[]>(
        `INSERT INTO subscriptions (user_id, status, plan, trial_start, trial_end)
         VALUES (?, 'trialing', 'premium', ?, ?)
         RETURNING id`,
        [userId, now.toISOString(), trialEnd.toISOString()]
    );

    const sub = await getSubscription(userId);
    return sub!;
}

/**
 * Activate a paid subscription
 */
export async function activateSubscription(
    userId: number,
    provider: string,
    providerCustomerId: string,
    providerSubscriptionId: string,
    periodEnd: Date
): Promise<void> {
    const now = new Date();

    await query(
        `UPDATE subscriptions 
         SET status = 'active',
             plan = 'premium',
             payment_provider = ?,
             provider_customer_id = ?,
             provider_subscription_id = ?,
             current_period_start = ?,
             current_period_end = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [provider, providerCustomerId, providerSubscriptionId, now.toISOString(), periodEnd.toISOString(), userId]
    );
}

/**
 * Cancel subscription (optionally at period end)
 */
export async function cancelSubscription(userId: number, atPeriodEnd: boolean = true): Promise<void> {
    if (atPeriodEnd) {
        await query(
            `UPDATE subscriptions 
             SET cancel_at_period_end = 1, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = ?`,
            [userId]
        );
    } else {
        await query(
            `UPDATE subscriptions 
             SET status = 'canceled', 
                 plan = 'free',
                 cancel_at_period_end = 0,
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = ?`,
            [userId]
        );
    }
}

/**
 * Mark trial as expired and downgrade to free
 */
export async function expireTrialSubscription(userId: number): Promise<void> {
    await query(
        `UPDATE subscriptions 
         SET status = 'free', 
             plan = 'free',
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND status = 'trialing'`,
        [userId]
    );
}

/**
 * Get subscription status summary for UI
 */
export async function getSubscriptionStatus(userId: number): Promise<{
    plan: 'free' | 'premium';
    status: string;
    isTrialing: boolean;
    trialDaysRemaining: number;
    periodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    provider: string | null;
}> {
    const sub = await getSubscription(userId);

    if (!sub) {
        return {
            plan: 'free',
            status: 'none',
            isTrialing: false,
            trialDaysRemaining: 0,
            periodEnd: null,
            cancelAtPeriodEnd: false,
            provider: null
        };
    }

    const inTrial = await isInTrial(userId);
    const trialDays = await getTrialDaysRemaining(userId);

    return {
        plan: (await isPremium(userId)) ? 'premium' : 'free',
        status: sub.status,
        isTrialing: inTrial,
        trialDaysRemaining: trialDays,
        periodEnd: sub.current_period_end || sub.trial_end,
        cancelAtPeriodEnd: sub.cancel_at_period_end === 1,
        provider: sub.payment_provider
    };
}
