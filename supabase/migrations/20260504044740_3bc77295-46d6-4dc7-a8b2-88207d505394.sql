
-- =========================
-- 1) قصص الأنبياء
-- =========================
CREATE TABLE IF NOT EXISTS public.prophet_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  excerpt text,
  content text,
  cover_image text,
  prophet_name text,
  order_index int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prophet_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "قصص منشورة للجميع" ON public.prophet_stories FOR SELECT
  USING (is_published OR has_role(auth.uid(),'admin'));
CREATE POLICY "الأدمن يدير القصص" ON public.prophet_stories FOR ALL
  TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_ps_updated BEFORE UPDATE ON public.prophet_stories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 2) الدروس والفيديوهات
-- =========================
CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  cover_image text,
  source_type text NOT NULL DEFAULT 'youtube', -- youtube | upload
  youtube_url text,
  video_url text,         -- لرفع الملف على storage
  thumbnail text,
  category text,
  series text,
  instructor text,
  duration_seconds int,
  status text NOT NULL DEFAULT 'draft', -- draft | published
  is_featured boolean NOT NULL DEFAULT false,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lessons_source_chk CHECK (source_type IN ('youtube','upload'))
);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "دروس منشورة للجميع" ON public.lessons FOR SELECT
  USING (status='published' OR has_role(auth.uid(),'admin'));
CREATE POLICY "الأدمن يدير الدروس" ON public.lessons FOR ALL
  TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_lessons_updated BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 3) تقدّم المستخدم في الدرس
-- =========================
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  seconds_watched int NOT NULL DEFAULT 0,
  last_position_sec int NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "المستخدم يدير تقدّمه" ON public.lesson_progress FOR ALL
  TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY "الأدمن يرى التقدّم" ON public.lesson_progress FOR SELECT
  TO authenticated USING (has_role(auth.uid(),'admin'));

-- =========================
-- 4) مفضلات الدروس والمقالات
-- =========================
CREATE TABLE IF NOT EXISTS public.lesson_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
ALTER TABLE public.lesson_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "المستخدم يدير مفضلة الدروس" ON public.lesson_favorites FOR ALL
  TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE TABLE IF NOT EXISTS public.article_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  article_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, article_slug)
);
ALTER TABLE public.article_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "المستخدم يدير مفضلة المقالات" ON public.article_favorites FOR ALL
  TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- =========================
-- 5) آخر زيارة (resume)
-- =========================
CREATE TABLE IF NOT EXISTS public.last_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entity_type text NOT NULL,  -- article | lesson | hadith | story
  entity_id text NOT NULL,
  title text,
  position_sec int,           -- للفيديو
  scroll_percent int,         -- للمقال
  visited_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_id)
);
ALTER TABLE public.last_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "المستخدم يدير زياراته" ON public.last_visits FOR ALL
  TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- =========================
-- 6) profiles: last_seen + avatar cooldown
-- =========================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS avatar_changed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.avatar_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  old_url text,
  new_url text,
  changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.avatar_change_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "المستخدم يرى سجل صوره" ON public.avatar_change_log FOR SELECT
  TO authenticated USING (auth.uid()=user_id OR has_role(auth.uid(),'admin'));

-- دالة تطبق فترة الـ60 يومًا
CREATE OR REPLACE FUNCTION public.change_avatar(_new_url text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid := auth.uid(); v_last timestamptz; v_old text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'غير مسجّل دخول'; END IF;
  SELECT avatar_changed_at, avatar_url INTO v_last, v_old FROM public.profiles WHERE user_id=v_uid;
  IF v_last IS NOT NULL AND v_last > now() - interval '60 days' THEN
    RETURN jsonb_build_object('ok',false,'reason','cooldown',
      'next_allowed_at', v_last + interval '60 days');
  END IF;
  UPDATE public.profiles SET avatar_url=_new_url, avatar_changed_at=now(), updated_at=now()
  WHERE user_id=v_uid;
  INSERT INTO public.avatar_change_log (user_id, old_url, new_url) VALUES (v_uid, v_old, _new_url);
  RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.change_avatar(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.change_avatar(text) TO authenticated;

-- دالة تحديث آخر نشاط
CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.profiles SET last_seen_at = now() WHERE user_id = auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.touch_last_seen() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;

-- =========================
-- 7) Leaderboards (real data)
-- =========================
CREATE OR REPLACE FUNCTION public.leaderboard(_period text DEFAULT 'all')
RETURNS TABLE (rank bigint, user_id uuid, full_name text, avatar_url text, points bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH base AS (
    SELECT p.user_id,
           p.full_name,
           p.avatar_url,
           CASE
             WHEN _period='week'  THEN (SELECT COALESCE(SUM(delta),0) FROM public.points_adjustments
                                         WHERE user_id=p.user_id AND created_at >= now() - interval '7 days')
                                       + (SELECT COUNT(*)*10 FROM public.article_reads
                                          WHERE user_id=p.user_id AND read_at >= now() - interval '7 days')
                                       + (SELECT COUNT(*)*5 FROM public.hadith_reads
                                          WHERE user_id=p.user_id AND read_at >= now() - interval '7 days')
             WHEN _period='month' THEN (SELECT COALESCE(SUM(delta),0) FROM public.points_adjustments
                                         WHERE user_id=p.user_id AND created_at >= now() - interval '30 days')
                                       + (SELECT COUNT(*)*10 FROM public.article_reads
                                          WHERE user_id=p.user_id AND read_at >= now() - interval '30 days')
                                       + (SELECT COUNT(*)*5 FROM public.hadith_reads
                                          WHERE user_id=p.user_id AND read_at >= now() - interval '30 days')
             ELSE p.total_points::bigint
           END AS points
    FROM public.profiles p
  )
  SELECT ROW_NUMBER() OVER (ORDER BY points DESC) AS rank,
         user_id, full_name, avatar_url, points
  FROM base
  WHERE points > 0
  ORDER BY points DESC
  LIMIT 50
$$;
GRANT EXECUTE ON FUNCTION public.leaderboard(text) TO authenticated, anon;
