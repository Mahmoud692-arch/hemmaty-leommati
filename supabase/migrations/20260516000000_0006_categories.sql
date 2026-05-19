-- 0006 — التصنيفات
CREATE TABLE public.categories (
    id              SERIAL PRIMARY KEY,
    parent_id       INTEGER REFERENCES public.categories(id),
    name_ar         VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    icon            VARCHAR(50),
    cover_image     TEXT,
    sort_order      SMALLINT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    content_count   INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
