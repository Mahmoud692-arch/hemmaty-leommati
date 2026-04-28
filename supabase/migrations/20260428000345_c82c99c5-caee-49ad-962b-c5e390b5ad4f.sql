
-- ============================================
-- 1) SITE_SETTINGS: تقييد القراءة + جدول عام منفصل
-- ============================================
DROP POLICY IF EXISTS "الإعدادات مرئية للجميع" ON public.site_settings;

CREATE POLICY "الإعدادات للأدمن فقط (قراءة)"
ON public.site_settings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- جدول إعدادات عامة آمنة (whitelist فقط)
CREATE TABLE IF NOT EXISTS public.public_site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
ALTER TABLE public.public_site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "إعدادات عامة قابلة للقراءة للجميع"
ON public.public_site_settings FOR SELECT TO public USING (true);
CREATE POLICY "الأدمن يدير الإعدادات العامة"
ON public.public_site_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 2) PROFILES: منع تعديل النقاط/المستوى من طرف المستخدم
-- ============================================
CREATE OR REPLACE FUNCTION public.protect_profile_stats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  -- المستخدم العادي ممنوع من تعديل هذه الحقول
  NEW.total_points   := OLD.total_points;
  NEW.level          := OLD.level;
  NEW.articles_read  := OLD.articles_read;
  NEW.hadiths_read   := OLD.hadiths_read;
  NEW.quizzes_passed := OLD.quizzes_passed;
  NEW.email          := OLD.email; -- منع تغيير البريد عبر هذا المسار
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_profile_stats_trg ON public.profiles;
CREATE TRIGGER protect_profile_stats_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_stats();

-- ============================================
-- 3) USER_BADGES: منع المستخدم من منح نفسه شارات
-- ============================================
DROP POLICY IF EXISTS "النظام يضيف شارات للمستخدم" ON public.user_badges;
CREATE POLICY "الأدمن فقط يضيف الشارات"
ON public.user_badges FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- دالة آمنة لمنح الشارات (تُستدعى من triggers/server)
CREATE OR REPLACE FUNCTION public.award_badge(_user_id uuid, _badge_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_badges (user_id, badge_key)
  VALUES (_user_id, _badge_key)
  ON CONFLICT DO NOTHING;
  RETURN true;
END; $$;
REVOKE EXECUTE ON FUNCTION public.award_badge(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_badge(uuid, text) TO authenticated;

-- ============================================
-- 4) MEDIA BUCKET: حذف السياسة المفتوحة القديمة
-- ============================================
DROP POLICY IF EXISTS "الوسائط مرئية للجميع" ON storage.objects;
DROP POLICY IF EXISTS "Public can view media" ON storage.objects;
-- الإبقاء على القراءة العامة عبر signed URLs أو bucket public flag فقط
-- إنشاء سياسة قراءة محدودة (الأدمن فقط للسرد)
CREATE POLICY "media_admin_list" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 5) ARTICLE_LIKES: المستخدم يرى إعجاباته فقط
-- ============================================
DROP POLICY IF EXISTS "الإعجابات مرئية للجميع المسجلين" ON public.article_likes;
CREATE POLICY "المستخدم يرى إعجاباته والإدارة الكل"
ON public.article_likes FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- view عام لعدّ الإعجابات لكل مقال (بدون كشف المستخدمين)
CREATE OR REPLACE VIEW public.article_likes_count AS
SELECT article_slug, COUNT(*)::int AS likes_count
FROM public.article_likes GROUP BY article_slug;
GRANT SELECT ON public.article_likes_count TO anon, authenticated;

-- ============================================
-- 6) سحب EXECUTE من anon لكل الدوال الإدارية
-- ============================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
      AND (p.proname LIKE 'admin\_%' OR p.proname IN ('award_badge','protect_profile_stats','submit_quiz_attempt','publish_due_articles','is_email_confirmed','has_role','handle_new_user'))
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon', r.proname, r.args);
    -- السماح للمصادقين بالدوال غير الإدارية
    IF r.proname IN ('has_role','is_email_confirmed','submit_quiz_attempt') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', r.proname, r.args);
    ELSIF r.proname LIKE 'admin\_%' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', r.proname, r.args);
    END IF;
  END LOOP;
END $$;

-- ============================================
-- 7) جداول الميزات الجديدة
-- ============================================

-- نقاط يدوية من الأدمن
CREATE TABLE IF NOT EXISTS public.points_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  notification_message TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.points_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "الأدمن يدير تعديلات النقاط"
ON public.points_adjustments FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "المستخدم يرى تعديلات نقاطه"
ON public.points_adjustments FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- إعلانات الرئيسية
CREATE TABLE IF NOT EXISTS public.homepage_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  image_url TEXT,
  link_url TEXT,
  position TEXT NOT NULL DEFAULT 'top', -- top|middle|bottom|sidebar
  order_index INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.homepage_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "الإعلانات النشطة مرئية للجميع"
ON public.homepage_ads FOR SELECT TO public
USING (is_active AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "الأدمن يدير الإعلانات"
ON public.homepage_ads FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

-- صفحات ديناميكية
CREATE TABLE IF NOT EXISTS public.cms_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.cms_pages(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  cover_image TEXT,
  show_in_nav BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "الصفحات المنشورة للجميع"
ON public.cms_pages FOR SELECT TO public
USING (is_published OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "الأدمن يدير الصفحات"
ON public.cms_pages FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

-- تتبع تقدّم القراءة (لتطبيق 85%)
CREATE TABLE IF NOT EXISTS public.article_read_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  article_slug TEXT NOT NULL,
  seconds_spent INTEGER NOT NULL DEFAULT 0,
  scroll_percent INTEGER NOT NULL DEFAULT 0,
  points_awarded BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, article_slug)
);
ALTER TABLE public.article_read_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "المستخدم يدير تقدّمه"
ON public.article_read_progress FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- TTS cache
CREATE TABLE IF NOT EXISTS public.article_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_slug TEXT NOT NULL UNIQUE,
  audio_url TEXT NOT NULL,
  voice TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.article_audio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "الصوتيات للجميع" ON public.article_audio FOR SELECT TO public USING (true);
CREATE POLICY "الأدمن يدير الصوتيات" ON public.article_audio FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- مفضلة القرآن (آيات/سور)
CREATE TABLE IF NOT EXISTS public.quran_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  surah_number INTEGER NOT NULL,
  ayah_number INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quran_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "المستخدم يدير مفضلته القرآنية"
ON public.quran_bookmarks FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 8) دوال إدارية جديدة
-- ============================================

-- إدارة النقاط اليدوية
CREATE OR REPLACE FUNCTION public.admin_adjust_points(_user_id uuid, _delta int, _reason text, _notify text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.profiles SET total_points = GREATEST(0, total_points + _delta), updated_at = now()
  WHERE user_id = _user_id;
  INSERT INTO public.points_adjustments (user_id, delta, reason, notification_message, created_by)
  VALUES (_user_id, _delta, _reason, _notify, auth.uid());
  IF _notify IS NOT NULL AND _notify <> '' THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (_user_id, CASE WHEN _delta>=0 THEN 'تمت إضافة نقاط لحسابك' ELSE 'تم خصم نقاط من حسابك' END, _notify, 'points');
  END IF;
  INSERT INTO public.audit_log (actor_id, actor_email, action, entity_type, entity_id, after_data)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()),
          'adjust_points', 'profile', _user_id::text, jsonb_build_object('delta',_delta,'reason',_reason));
  RETURN true;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_points(uuid,int,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_points(uuid,int,text,text) TO authenticated;

-- list hadiths للمساعد
CREATE OR REPLACE FUNCTION public.admin_list_hadiths(
  _hadith_id uuid DEFAULT NULL,
  _category text DEFAULT NULL,
  _source text DEFAULT NULL,
  _has_explanation boolean DEFAULT NULL,
  _has_benefit boolean DEFAULT NULL,
  _limit int DEFAULT 20,
  _offset int DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_data jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(h.*) - 'created_at' - 'updated_at'), '[]'::jsonb)
  INTO v_data FROM (
    SELECT * FROM public.hadiths
    WHERE (_hadith_id IS NULL OR id = _hadith_id)
      AND (_category IS NULL OR category ILIKE '%'||_category||'%')
      AND (_source IS NULL OR source ILIKE '%'||_source||'%')
      AND (_has_explanation IS NULL OR (explanation IS NOT NULL AND length(explanation)>0) = _has_explanation)
      AND (_has_benefit IS NULL OR (benefit IS NOT NULL AND length(benefit)>0) = _has_benefit)
    ORDER BY number
    LIMIT GREATEST(_limit,1) OFFSET GREATEST(_offset,0)
  ) h;
  RETURN v_data;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_list_hadiths(uuid,text,text,boolean,boolean,int,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_hadiths(uuid,text,text,boolean,boolean,int,int) TO authenticated;

-- إدارة صفحات CMS من الأدمن
CREATE OR REPLACE FUNCTION public.admin_upsert_page(_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _payload ? 'id' AND (_payload->>'id') <> '' THEN
    UPDATE public.cms_pages SET
      slug = COALESCE(_payload->>'slug', slug),
      title = COALESCE(_payload->>'title', title),
      content = COALESCE(_payload->>'content', content),
      meta_description = COALESCE(_payload->>'meta_description', meta_description),
      meta_keywords = COALESCE(_payload->>'meta_keywords', meta_keywords),
      cover_image = COALESCE(_payload->>'cover_image', cover_image),
      show_in_nav = COALESCE((_payload->>'show_in_nav')::bool, show_in_nav),
      order_index = COALESCE((_payload->>'order_index')::int, order_index),
      is_published = COALESCE((_payload->>'is_published')::bool, is_published),
      parent_id = NULLIF(_payload->>'parent_id','')::uuid,
      updated_at = now()
    WHERE id = (_payload->>'id')::uuid RETURNING id INTO v_id;
  ELSE
    INSERT INTO public.cms_pages (slug,title,content,meta_description,meta_keywords,cover_image,show_in_nav,order_index,is_published,parent_id)
    VALUES (
      _payload->>'slug', _payload->>'title', _payload->>'content',
      _payload->>'meta_description', _payload->>'meta_keywords', _payload->>'cover_image',
      COALESCE((_payload->>'show_in_nav')::bool, true),
      COALESCE((_payload->>'order_index')::int, 0),
      COALESCE((_payload->>'is_published')::bool, true),
      NULLIF(_payload->>'parent_id','')::uuid
    ) RETURNING id INTO v_id;
  END IF;
  INSERT INTO public.audit_log (actor_id, actor_email, action, entity_type, entity_id, after_data)
  VALUES (auth.uid(),(SELECT email FROM auth.users WHERE id=auth.uid()),'upsert_page','cms_page',v_id::text,_payload);
  RETURN v_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_page(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_page(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_page(_page_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM public.cms_pages WHERE id = _page_id;
  INSERT INTO public.audit_log (actor_id,actor_email,action,entity_type,entity_id)
  VALUES (auth.uid(),(SELECT email FROM auth.users WHERE id=auth.uid()),'delete_page','cms_page',_page_id::text);
  RETURN true;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_delete_page(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_page(uuid) TO authenticated;

-- إدارة الإعلانات
CREATE OR REPLACE FUNCTION public.admin_upsert_ad(_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _payload ? 'id' AND (_payload->>'id') <> '' THEN
    UPDATE public.homepage_ads SET
      title=COALESCE(_payload->>'title',title),
      body=COALESCE(_payload->>'body',body),
      image_url=COALESCE(_payload->>'image_url',image_url),
      link_url=COALESCE(_payload->>'link_url',link_url),
      position=COALESCE(_payload->>'position',position),
      order_index=COALESCE((_payload->>'order_index')::int,order_index),
      starts_at=NULLIF(_payload->>'starts_at','')::timestamptz,
      ends_at=NULLIF(_payload->>'ends_at','')::timestamptz,
      is_active=COALESCE((_payload->>'is_active')::bool,is_active),
      updated_at=now()
    WHERE id=(_payload->>'id')::uuid RETURNING id INTO v_id;
  ELSE
    INSERT INTO public.homepage_ads (title,body,image_url,link_url,position,order_index,starts_at,ends_at,is_active)
    VALUES (_payload->>'title',_payload->>'body',_payload->>'image_url',_payload->>'link_url',
      COALESCE(_payload->>'position','top'),COALESCE((_payload->>'order_index')::int,0),
      NULLIF(_payload->>'starts_at','')::timestamptz,NULLIF(_payload->>'ends_at','')::timestamptz,
      COALESCE((_payload->>'is_active')::bool,true))
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_ad(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_ad(jsonb) TO authenticated;

-- منح نقاط القراءة عند 85%
CREATE OR REPLACE FUNCTION public.award_reading_points(_article_slug text, _scroll_percent int, _seconds_spent int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_min_seconds int;
  v_already boolean;
  v_read_minutes int;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','not_authenticated'); END IF;
  SELECT COALESCE(read_minutes,3) INTO v_read_minutes FROM public.articles WHERE slug = _article_slug;
  IF v_read_minutes IS NULL THEN v_read_minutes := 3; END IF;
  v_min_seconds := GREATEST(30, (v_read_minutes * 60 * 0.85)::int);

  INSERT INTO public.article_read_progress (user_id, article_slug, seconds_spent, scroll_percent, updated_at)
  VALUES (v_uid, _article_slug, _seconds_spent, _scroll_percent, now())
  ON CONFLICT (user_id, article_slug) DO UPDATE SET
    seconds_spent = GREATEST(public.article_read_progress.seconds_spent, EXCLUDED.seconds_spent),
    scroll_percent = GREATEST(public.article_read_progress.scroll_percent, EXCLUDED.scroll_percent),
    updated_at = now();

  SELECT points_awarded INTO v_already FROM public.article_read_progress
  WHERE user_id = v_uid AND article_slug = _article_slug;
  IF v_already THEN RETURN jsonb_build_object('ok',true,'awarded',false,'reason','already'); END IF;

  IF _scroll_percent >= 85 AND _seconds_spent >= v_min_seconds THEN
    UPDATE public.article_read_progress SET points_awarded = true
    WHERE user_id = v_uid AND article_slug = _article_slug;
    -- bypass trigger via SECURITY DEFINER + explicit
    UPDATE public.profiles SET total_points = total_points + 10, articles_read = articles_read + 1
    WHERE user_id = v_uid;
    INSERT INTO public.article_reads (user_id, article_slug) VALUES (v_uid, _article_slug);
    RETURN jsonb_build_object('ok',true,'awarded',true,'points',10);
  END IF;
  RETURN jsonb_build_object('ok',true,'awarded',false,'min_seconds',v_min_seconds,'scroll',_scroll_percent);
END; $$;
REVOKE EXECUTE ON FUNCTION public.award_reading_points(text,int,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_reading_points(text,int,int) TO authenticated;
