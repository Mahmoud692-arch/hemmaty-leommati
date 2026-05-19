-- 0005 — FCM Tokens (Push Notifications)
CREATE TABLE public.fcm_tokens (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token           TEXT NOT NULL UNIQUE,
    device_type     VARCHAR(10) NOT NULL CHECK (device_type IN ('ios','android','web')),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_used_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fcm_user ON public.fcm_tokens(user_id) WHERE is_active = true;
