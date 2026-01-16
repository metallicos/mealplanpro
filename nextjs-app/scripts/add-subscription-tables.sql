-- Migration: Add Subscription System Tables
-- Run this migration on your Turso database

-- 1. Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    -- Payment provider info (polymorphic)
    payment_provider TEXT, -- 'stripe', 'paypal', 'cmi', null (for trial)
    provider_customer_id TEXT,
    provider_subscription_id TEXT,
    -- Status
    status TEXT DEFAULT 'trialing', -- 'trialing', 'active', 'canceled', 'past_due', 'free'
    plan TEXT DEFAULT 'premium', -- 'free', 'premium'
    -- Trial period
    trial_start TEXT,
    trial_end TEXT,
    -- Billing period
    current_period_start TEXT,
    current_period_end TEXT,
    cancel_at_period_end INTEGER DEFAULT 0,
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Feature usage tracking
CREATE TABLE IF NOT EXISTS feature_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    feature TEXT NOT NULL, -- 'coach', 'smart_plan'
    period TEXT NOT NULL, -- 'YYYY-MM-DD' for daily, 'YYYY-WW' for weekly
    count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, feature, period),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Payment transactions log
CREATE TABLE IF NOT EXISTS payment_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    subscription_id INTEGER,
    provider TEXT NOT NULL, -- 'stripe', 'paypal', 'cmi'
    provider_transaction_id TEXT,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
    metadata TEXT, -- JSON for additional info
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_feature_usage_lookup ON feature_usage(user_id, feature, period);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider ON payment_transactions(provider, provider_transaction_id);
