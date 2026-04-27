
-- =========================================================
-- 1) تأمين جدول profiles: عرض عمومي بدون بيانات حساسة
-- =========================================================

-- View عام آمن للملفات الشخصية (بدون email, phone, date_of_birth)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT 
  id, user_id, full_name, avatar_url, country,
  level, total_points, articles_read, hadiths_read, quizzes_passed,
  created_at, updated_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated, anon;

-- استبدال سياسة SELECT المفتوحة
DROP POLICY IF EXISTS "الملفات الشخصية مرئية للجميع المس" ON public.profiles;

CREATE POLICY "المستخدم يرى ملفه والإدارة ترى الكل"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);

-- =========================================================
-- 2) تأمين quiz_questions: إخفاء correct_index
-- =========================================================

CREATE OR REPLACE VIEW public.quiz_questions_safe
WITH (security_invoker=on) AS
SELECT 
  id, quiz_id, question_text, question_image, question_type,
  options, points, order_index, created_at
FROM public.quiz_questions;

GRANT SELECT ON public.quiz_questions_safe TO authenticated;

-- استبدال سياسة SELECT لإخفاء correct_index عن غير الأدمن
DROP POLICY IF EXISTS "أسئلة الكويز مرئية" ON public.quiz_questions;

CREATE POLICY "أسئلة الكويز للأدمن فقط مع الأعمدة الحساسة"
ON public.quiz_questions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 3) تأمين user_badges: المستخدم يرى شاراته فقط
-- =========================================================

DROP POLICY IF EXISTS "الشارات مرئية للجميع المسجلين" ON public.user_badges;

CREATE POLICY "المستخدم يرى شاراته والإدارة ترى الكل"
ON public.user_badges
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);

-- =========================================================
-- 4) تأمين storage.objects للـ media bucket
-- =========================================================

-- حذف السياسات المفتوحة الموجودة على media (إن وجدت)
DROP POLICY IF EXISTS "media public read" ON storage.objects;
DROP POLICY IF EXISTS "Public read media" ON storage.objects;
DROP POLICY IF EXISTS "media_public_select" ON storage.objects;
DROP POLICY IF EXISTS "anyone can list media" ON storage.objects;

-- القراءة المباشرة للملفات (عبر الرابط) متاحة للجميع، لكن LIST مقيّد
CREATE POLICY "media files readable by url"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'media');

-- الرفع للأدمن فقط
DROP POLICY IF EXISTS "admins upload media" ON storage.objects;
CREATE POLICY "admins upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media' 
  AND public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "admins update media" ON storage.objects;
CREATE POLICY "admins update media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins delete media" ON storage.objects;
CREATE POLICY "admins delete media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 5) RPCs جديدة للأدوات الإدارية
-- =========================================================

-- تعديل مقال
CREATE OR REPLACE FUNCTION public.admin_update_article(_article_id uuid, _payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_before jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT to_jsonb(a.*) INTO v_before FROM public.articles a WHERE id = _article_id;
  IF v_before IS NULL THEN RAISE EXCEPTION 'Article not found'; END IF;

  UPDATE public.articles SET
    title        = COALESCE(_payload->>'title', title),
    excerpt      = COALESCE(_payload->>'excerpt', excerpt),
    content      = COALESCE(_payload->>'content', content),
    cover_image  = COALESCE(_payload->>'cover_image', cover_image),
    category     = COALESCE(_payload->>'category', category),
    read_minutes = COALESCE((_payload->>'read_minutes')::int, read_minutes),
    status       = COALESCE(_payload->>'status', status),
    is_published = CASE 
                     WHEN _payload ? 'status' THEN (_payload->>'status') = 'published'
                     ELSE is_published
                   END,
    scheduled_at = CASE 
                     WHEN _payload ? 'scheduled_at' THEN NULLIF(_payload->>'scheduled_at','')::timestamptz
                     ELSE scheduled_at
                   END,
    updated_at   = now()
  WHERE id = _article_id;

  INSERT INTO public.audit_log (actor_id, actor_email, action, entity_type, entity_id, before_data, after_data)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()),
          'update_via_ai', 'article', _article_id::text, v_before, _payload);

  RETURN _article_id;
END;
$$;

-- حذف مقال
CREATE OR REPLACE FUNCTION public.admin_delete_article(_article_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_before jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT to_jsonb(a.*) INTO v_before FROM public.articles a WHERE id = _article_id;
  DELETE FROM public.articles WHERE id = _article_id;
  INSERT INTO public.audit_log (actor_id, actor_email, action, entity_type, entity_id, before_data)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()),
          'delete_via_ai', 'article', _article_id::text, v_before);
  RETURN true;
END;
$$;

-- تعديل حديث
CREATE OR REPLACE FUNCTION public.admin_update_hadith(_hadith_id uuid, _payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_before jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT to_jsonb(h.*) INTO v_before FROM public.hadiths h WHERE id = _hadith_id;
  IF v_before IS NULL THEN RAISE EXCEPTION 'Hadith not found'; END IF;

  UPDATE public.hadiths SET
    arabic_text  = COALESCE(_payload->>'arabic_text', arabic_text),
    narrator     = COALESCE(_payload->>'narrator', narrator),
    source       = COALESCE(_payload->>'source', source),
    explanation  = COALESCE(_payload->>'explanation', explanation),
    benefit      = COALESCE(_payload->>'benefit', benefit),
    category     = COALESCE(_payload->>'category', category),
    number       = COALESCE((_payload->>'number')::int, number),
    is_published = COALESCE((_payload->>'is_published')::boolean, is_published),
    updated_at   = now()
  WHERE id = _hadith_id;

  INSERT INTO public.audit_log (actor_id, actor_email, action, entity_type, entity_id, before_data, after_data)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()),
          'update_via_ai', 'hadith', _hadith_id::text, v_before, _payload);
  RETURN _hadith_id;
END;
$$;

-- حذف حديث
CREATE OR REPLACE FUNCTION public.admin_delete_hadith(_hadith_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_before jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT to_jsonb(h.*) INTO v_before FROM public.hadiths h WHERE id = _hadith_id;
  DELETE FROM public.hadiths WHERE id = _hadith_id;
  INSERT INTO public.audit_log (actor_id, actor_email, action, entity_type, entity_id, before_data)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()),
          'delete_via_ai', 'hadith', _hadith_id::text, v_before);
  RETURN true;
END;
$$;

-- تعديل كويز (مع استبدال الأسئلة اختياريًا)
CREATE OR REPLACE FUNCTION public.admin_update_quiz(_quiz_id uuid, _payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  v_before jsonb;
  v_q jsonb;
  v_idx int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT to_jsonb(q.*) INTO v_before FROM public.quizzes q WHERE id = _quiz_id;
  IF v_before IS NULL THEN RAISE EXCEPTION 'Quiz not found'; END IF;

  UPDATE public.quizzes SET
    title            = COALESCE(_payload->>'title', title),
    description      = COALESCE(_payload->>'description', description),
    duration_minutes = COALESCE((_payload->>'duration_minutes')::int, duration_minutes),
    attempt_policy   = COALESCE(_payload->>'attempt_policy', attempt_policy),
    is_active        = COALESCE((_payload->>'is_active')::boolean, is_active),
    updated_at       = now()
  WHERE id = _quiz_id;

  -- إن جاءت أسئلة جديدة استبدلها كاملة
  IF _payload ? 'questions' THEN
    DELETE FROM public.quiz_questions WHERE quiz_id = _quiz_id;
    FOR v_q IN SELECT * FROM jsonb_array_elements(COALESCE(_payload->'questions','[]'::jsonb))
    LOOP
      INSERT INTO public.quiz_questions (quiz_id, question_text, question_type, options, correct_index, points, order_index)
      VALUES (
        _quiz_id,
        v_q->>'question_text',
        COALESCE(v_q->>'question_type', 'mcq'),
        COALESCE(v_q->'options', '[]'::jsonb),
        NULLIF(v_q->>'correct_index','')::int,
        COALESCE((v_q->>'points')::int, 1),
        v_idx
      );
      v_idx := v_idx + 1;
    END LOOP;
  END IF;

  INSERT INTO public.audit_log (actor_id, actor_email, action, entity_type, entity_id, before_data, after_data)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()),
          'update_via_ai', 'quiz', _quiz_id::text, v_before, _payload);
  RETURN _quiz_id;
END;
$$;

-- حذف كويز
CREATE OR REPLACE FUNCTION public.admin_delete_quiz(_quiz_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_before jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT to_jsonb(q.*) INTO v_before FROM public.quizzes q WHERE id = _quiz_id;
  DELETE FROM public.quizzes WHERE id = _quiz_id;
  INSERT INTO public.audit_log (actor_id, actor_email, action, entity_type, entity_id, before_data)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()),
          'delete_via_ai', 'quiz', _quiz_id::text, v_before);
  RETURN true;
END;
$$;

-- جدولة محتوى
CREATE OR REPLACE FUNCTION public.admin_schedule_content(_type text, _content_id uuid, _publish_at timestamptz)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _type = 'article' THEN
    UPDATE public.articles 
      SET status = 'scheduled', scheduled_at = _publish_at, is_published = false, updated_at = now()
    WHERE id = _content_id;
  ELSIF _type = 'quiz' THEN
    UPDATE public.quizzes
      SET starts_at = _publish_at, is_active = false, updated_at = now()
    WHERE id = _content_id;
  ELSE
    RAISE EXCEPTION 'Invalid type';
  END IF;
  INSERT INTO public.audit_log (actor_id, actor_email, action, entity_type, entity_id, after_data)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()),
          'schedule_via_ai', _type, _content_id::text,
          jsonb_build_object('publish_at', _publish_at));
  RETURN true;
END;
$$;

-- مراجعة تعليق
CREATE OR REPLACE FUNCTION public.admin_moderate_comment(_comment_id uuid, _action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_before jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT to_jsonb(c.*) INTO v_before FROM public.article_comments c WHERE id = _comment_id;

  IF _action = 'approve' THEN
    UPDATE public.article_comments SET is_approved = true, is_hidden = false WHERE id = _comment_id;
  ELSIF _action = 'reject' THEN
    UPDATE public.article_comments SET is_approved = false, is_hidden = true WHERE id = _comment_id;
  ELSIF _action = 'delete' THEN
    DELETE FROM public.article_comments WHERE id = _comment_id;
  ELSE
    RAISE EXCEPTION 'Invalid action';
  END IF;

  INSERT INTO public.audit_log (actor_id, actor_email, action, entity_type, entity_id, before_data, after_data)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()),
          'moderate_via_ai', 'comment', _comment_id::text, v_before, jsonb_build_object('action', _action));
  RETURN true;
END;
$$;

-- الرد على سؤال مستخدم
CREATE OR REPLACE FUNCTION public.admin_respond_to_question(_question_id uuid, _answer_text text, _publish boolean DEFAULT false)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.user_questions 
    SET answer = _answer_text, 
        answered_at = now(), 
        is_published = _publish,
        updated_at = now()
  WHERE id = _question_id
  RETURNING user_id INTO v_user;

  IF v_user IS NULL THEN RAISE EXCEPTION 'Question not found'; END IF;

  -- إشعار للمستخدم إذا نُشر
  IF _publish THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (v_user, 'تم الردّ على سؤالك', LEFT(_answer_text, 200), 'answer');
  END IF;

  INSERT INTO public.audit_log (actor_id, actor_email, action, entity_type, entity_id, after_data)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()),
          'respond_via_ai', 'question', _question_id::text,
          jsonb_build_object('published', _publish));
  RETURN _question_id;
END;
$$;

-- معلومات مستخدم (للأدمن فقط)
CREATE OR REPLACE FUNCTION public.admin_get_user_info(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_data jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT jsonb_build_object(
    'profile', to_jsonb(p.*),
    'questions_count', (SELECT COUNT(*) FROM public.user_questions WHERE user_id = _user_id),
    'comments_count', (SELECT COUNT(*) FROM public.article_comments WHERE user_id = _user_id),
    'attempts_count', (SELECT COUNT(*) FROM public.quiz_attempts WHERE user_id = _user_id),
    'badges', (SELECT COALESCE(jsonb_agg(badge_key), '[]'::jsonb) FROM public.user_badges WHERE user_id = _user_id)
  ) INTO v_data
  FROM public.profiles p WHERE p.user_id = _user_id;
  RETURN v_data;
END;
$$;

-- أداء مقال
CREATE OR REPLACE FUNCTION public.admin_article_performance(_article_slug text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _article_slug IS NULL THEN
    RETURN jsonb_build_object(
      'total_articles', (SELECT COUNT(*) FROM public.articles),
      'total_reads', (SELECT COUNT(*) FROM public.article_reads),
      'total_likes', (SELECT COUNT(*) FROM public.article_likes),
      'total_saves', (SELECT COUNT(*) FROM public.article_saves),
      'total_comments', (SELECT COUNT(*) FROM public.article_comments)
    );
  END IF;
  RETURN jsonb_build_object(
    'slug', _article_slug,
    'reads', (SELECT COUNT(*) FROM public.article_reads WHERE article_slug = _article_slug),
    'likes', (SELECT COUNT(*) FROM public.article_likes WHERE article_slug = _article_slug),
    'saves', (SELECT COUNT(*) FROM public.article_saves WHERE article_slug = _article_slug),
    'comments', (SELECT COUNT(*) FROM public.article_comments WHERE article_slug = _article_slug)
  );
END;
$$;

-- أداء كويز
CREATE OR REPLACE FUNCTION public.admin_quiz_performance(_quiz_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _quiz_id IS NULL THEN
    RETURN jsonb_build_object(
      'total_quizzes', (SELECT COUNT(*) FROM public.quizzes),
      'total_attempts', (SELECT COUNT(*) FROM public.quiz_attempts),
      'submitted', (SELECT COUNT(*) FROM public.quiz_attempts WHERE status = 'submitted')
    );
  END IF;
  RETURN jsonb_build_object(
    'quiz_id', _quiz_id,
    'attempts', (SELECT COUNT(*) FROM public.quiz_attempts WHERE quiz_id = _quiz_id),
    'avg_score', (SELECT AVG(score) FROM public.quiz_attempts WHERE quiz_id = _quiz_id AND status='submitted'),
    'avg_time_sec', (SELECT AVG(time_spent_seconds) FROM public.quiz_attempts WHERE quiz_id = _quiz_id AND status='submitted')
  );
END;
$$;

-- تعديل إعداد الموقع
CREATE OR REPLACE FUNCTION public.admin_set_site_setting(_key text, _value jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  INSERT INTO public.site_settings (key, value, updated_by)
  VALUES (_key, _value, auth.uid())
  ON CONFLICT (key) DO UPDATE SET value = _value, updated_by = auth.uid(), updated_at = now();

  INSERT INTO public.audit_log (actor_id, actor_email, action, entity_type, entity_id, after_data)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()),
          'set_setting', 'site_settings', _key, _value);
  RETURN true;
END;
$$;
