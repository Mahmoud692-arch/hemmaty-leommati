-- 0002 — المستخدمون
-- ═══════════════════════════════════════════
CREATE TABLE users (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               INTEGER NOT NULL DEFAULT 1,

    -- بيانات مشفّرة (AES-256 via Laravel encrypt())
    email_encrypted         TEXT NOT NULL,
    phone_encrypted         TEXT,

    -- Blind Index للبحث (HMAC-SHA256 بمفتاح BLIND_INDEX_KEY المستقل)
    email_hash              BYTEA NOT NULL UNIQUE,
    phone_hash              BYTEA UNIQUE,

    -- بيانات عامة
    username                VARCHAR(50) NOT NULL UNIQUE,
    display_name            VARCHAR(100),
    avatar_url              TEXT,
    bio                     TEXT CHECK (char_length(bio) <= 500),
    referral_code           VARCHAR(20) NOT NULL UNIQUE,

    -- المصادقة
    password_hash           TEXT NOT NULL,
    two_factor_secret       TEXT,
    two_factor_backup_codes TEXT,

    -- المستوى والنقاط
    points_total            INTEGER NOT NULL DEFAULT 0 CHECK (points_total >= 0),
    level_id                INTEGER NOT NULL DEFAULT 1 REFERENCES levels(id),

    -- الإعدادات
    language                VARCHAR(10) NOT NULL DEFAULT 'ar',
    timezone                VARCHAR(50) NOT NULL DEFAULT 'Asia/Riyadh',
    date_of_birth           DATE,
    is_minor                BOOLEAN GENERATED ALWAYS AS (
                                date_of_birth IS NOT NULL AND
                                date_of_birth > CURRENT_DATE - INTERVAL '18 years'
                            ) STORED,

    -- الحالة
    email_verified_at       TIMESTAMPTZ,
    is_active               BOOLEAN NOT NULL DEFAULT true,
    is_banned               BOOLEAN NOT NULL DEFAULT false,
    ban_reason              TEXT,
    banned_until            TIMESTAMPTZ,
    force_password_change   BOOLEAN NOT NULL DEFAULT false,
    avatar_changed_at       TIMESTAMPTZ,
    onboarding_completed    BOOLEAN NOT NULL DEFAULT false,
    onboarding_step         SMALLINT NOT NULL DEFAULT 0,
    role                    VARCHAR(30) NOT NULL DEFAULT 'user'
                            CHECK (role IN (
                                'user','super_admin','content_editor',
                                'content_reviewer','support','data_analyst','ads_manager'
                            )),

    -- أمان
    last_ip                 INET,
    last_seen_at            TIMESTAMPTZ,
    failed_login_count      SMALLINT NOT NULL DEFAULT 0,
    locked_until            TIMESTAMPTZ,

    -- timestamps
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ,

    CONSTRAINT users_age_check CHECK (
        date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE - INTERVAL '13 years'
    )
);

CREATE INDEX idx_users_email_hash   ON users(email_hash) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_username     ON users(username)   WHERE deleted_at IS NULL;
CREATE INDEX idx_users_referral     ON users(referral_code);
CREATE INDEX idx_users_level        ON users(level_id);
CREATE INDEX idx_users_points       ON users(points_total DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role         ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_locked       ON users(locked_until) WHERE locked_until IS NOT NULL;
