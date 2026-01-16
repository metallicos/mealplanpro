-- Analytics tables for traffic and subscription monitoring
-- Run this migration on your Turso database

-- Page Views / Traffic Analytics
CREATE TABLE IF NOT EXISTS page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    user_id INTEGER,
    page_path TEXT NOT NULL,
    referrer TEXT,
    user_agent TEXT,
    ip_hash TEXT, -- Hashed for privacy
    country TEXT,
    device_type TEXT, -- 'mobile', 'tablet', 'desktop'
    browser TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Daily aggregated stats (for faster queries)
CREATE TABLE IF NOT EXISTS daily_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE, -- YYYY-MM-DD format
    page_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    returning_users INTEGER DEFAULT 0,
    mobile_visits INTEGER DEFAULT 0,
    desktop_visits INTEGER DEFAULT 0,
    tablet_visits INTEGER DEFAULT 0,
    avg_session_duration INTEGER DEFAULT 0, -- in seconds
    bounce_rate REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Subscription events for tracking
CREATE TABLE IF NOT EXISTS subscription_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    event_type TEXT NOT NULL, -- 'trial_started', 'trial_ended', 'subscribed', 'renewed', 'canceled', 'churned'
    subscription_id INTEGER,
    payment_provider TEXT,
    amount REAL,
    currency TEXT DEFAULT 'USD',
    metadata TEXT, -- JSON for additional data
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);

-- Monthly revenue stats
CREATE TABLE IF NOT EXISTS monthly_revenue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month TEXT NOT NULL UNIQUE, -- YYYY-MM format
    mrr REAL DEFAULT 0, -- Monthly Recurring Revenue
    new_subscriptions INTEGER DEFAULT 0,
    churned_subscriptions INTEGER DEFAULT 0,
    trial_conversions INTEGER DEFAULT 0,
    total_revenue REAL DEFAULT 0,
    refunds REAL DEFAULT 0,
    net_revenue REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_user ON page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
CREATE INDEX IF NOT EXISTS idx_subscription_events_user ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created ON subscription_events(created_at);
CREATE INDEX IF NOT EXISTS idx_monthly_revenue_month ON monthly_revenue(month);
