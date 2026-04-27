
-- 1) دالة لجلب الحالة الحالية لكيان (قبل التعديل) لعرضها في معاينة المساعد
CREATE OR REPLACE FUNCTION public.admin_preview_changes(_entity_type text, _entity_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_current jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF _entity_type = 'article' THEN
    SELECT to_jsonb(a.*) INTO v_current FROM public.articles a WHERE id = _entity_id::uuid;
  ELSIF _entity_type = 'hadith' THEN
    SELECT to_jsonb(h.*) INTO v_current FROM public.hadiths h WHERE id = _entity_id::uuid;
  ELSIF _entity_type = 'quiz' THEN
    SELECT to_jsonb(q.*) INTO v_current FROM public.quizzes q WHERE id = _entity_id::uuid;
  ELSIF _entity_type = 'comment' THEN
    SELECT to_jsonb(c.*) INTO v_current FROM public.article_comments c WHERE id = _entity_id::uuid;
  ELSIF _entity_type = 'question' THEN
    SELECT to_jsonb(q.*) INTO v_current FROM public.user_questions q WHERE id = _entity_id::uuid;
  ELSIF _entity_type = 'site_setting' THEN
    SELECT to_jsonb(s.*) INTO v_current FROM public.site_settings s WHERE key = _entity_id;
  ELSE
    RAISE EXCEPTION 'Invalid entity_type';
  END IF;

  RETURN COALESCE(v_current, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_preview_changes(text, text) FROM anon;

-- 2) دالة لاختبارات سلامة سياسات RLS (تستدعى من لوحة الإدارة)
CREATE OR REPLACE FUNCTION public.admin_run_rls_smoke_tests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_results jsonb := '[]'::jsonb;
  v_count int;
  v_pass boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Test 1: profiles RLS مفعّل
  SELECT relrowsecurity INTO v_pass FROM pg_class WHERE oid = 'public.profiles'::regclass;
  v_results := v_results || jsonb_build_object(
    'name', 'profiles: RLS مفعّل',
    'pass', COALESCE(v_pass, false),
    'detail', 'يجب أن تكون RLS مفعّلة على جدول الملفات الشخصية'
  );

  -- Test 2: profiles لا توجد سياسة SELECT مفتوحة (USING true)
  SELECT NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND cmd='SELECT' AND qual='true'
  ) INTO v_pass;
  v_results := v_results || jsonb_build_object(
    'name', 'profiles: لا تسرّب بيانات للجميع',
    'pass', v_pass,
    'detail', 'لا توجد سياسة SELECT تستخدم USING(true)'
  );

  -- Test 3: user_badges RLS مفعّل وله سياسة SELECT مقيّدة
  SELECT relrowsecurity INTO v_pass FROM pg_class WHERE oid = 'public.user_badges'::regclass;
  v_results := v_results || jsonb_build_object(
    'name', 'user_badges: RLS مفعّل',
    'pass', COALESCE(v_pass, false),
    'detail', 'حماية الشارات الخاصة بكل مستخدم'
  );

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_badges' AND cmd='SELECT'
      AND qual LIKE '%auth.uid()%'
  ) INTO v_pass;
  v_results := v_results || jsonb_build_object(
    'name', 'user_badges: SELECT مقيّد بالمالك أو الأدمن',
    'pass', v_pass,
    'detail', 'سياسة SELECT تتحقق من auth.uid()'
  );

  -- Test 4: quiz_questions_safe view موجود
  SELECT EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='quiz_questions_safe'
  ) INTO v_pass;
  v_results := v_results || jsonb_build_object(
    'name', 'quiz_questions_safe: View آمن موجود',
    'pass', v_pass,
    'detail', 'يستخدمه المستخدمون بدلًا من الجدول الأصلي لإخفاء correct_index'
  );

  -- Test 5: quiz_questions يمنع SELECT لغير الأدمن
  SELECT NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='quiz_questions' AND cmd='SELECT'
      AND qual NOT LIKE '%has_role%'
  ) INTO v_pass;
  v_results := v_results || jsonb_build_object(
    'name', 'quiz_questions: لا تكشف الإجابات الصحيحة',
    'pass', v_pass,
    'detail', 'كل سياسات SELECT على الجدول مقيّدة بـ has_role(admin)'
  );

  -- Test 6: profiles_public view موجود
  SELECT EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='profiles_public'
  ) INTO v_pass;
  v_results := v_results || jsonb_build_object(
    'name', 'profiles_public: View آمن موجود',
    'pass', v_pass,
    'detail', 'لإخفاء البريد والهاتف وتاريخ الميلاد عن العامة'
  );

  -- Test 7: media bucket موجود
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id='media'
  ) INTO v_pass;
  v_results := v_results || jsonb_build_object(
    'name', 'storage.media: Bucket موجود',
    'pass', v_pass,
    'detail', 'لتخزين صور المقالات والوسائط'
  );

  -- Test 8: storage.objects له سياسة INSERT مقيّدة بالأدمن للـ media
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND cmd='INSERT'
      AND with_check LIKE '%media%' AND with_check LIKE '%has_role%'
  ) INTO v_pass;
  v_results := v_results || jsonb_build_object(
    'name', 'storage.media: الرفع للأدمن فقط',
    'pass', v_pass,
    'detail', 'سياسة INSERT على media تتطلب دور admin'
  );

  -- Test 9: audit_log غير قابل للقراءة لغير الأدمن
  SELECT NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='audit_log' AND cmd='SELECT'
      AND qual NOT LIKE '%has_role%'
  ) INTO v_pass;
  v_results := v_results || jsonb_build_object(
    'name', 'audit_log: للأدمن فقط',
    'pass', v_pass,
    'detail', 'سجل التدقيق محمي'
  );

  -- Test 10: ai_assistant_messages مقيّد بالمالك+الأدمن
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ai_assistant_messages' AND cmd='SELECT'
      AND qual LIKE '%auth.uid()%' AND qual LIKE '%has_role%'
  ) INTO v_pass;
  v_results := v_results || jsonb_build_object(
    'name', 'ai_assistant_messages: محادثات المساعد محمية',
    'pass', v_pass,
    'detail', 'كل أدمن يرى رسائله فقط'
  );

  RETURN jsonb_build_object(
    'tested_at', now(),
    'tester_email', (SELECT email FROM auth.users WHERE id = auth.uid()),
    'results', v_results,
    'total', jsonb_array_length(v_results),
    'passed', (SELECT COUNT(*) FROM jsonb_array_elements(v_results) e WHERE (e->>'pass')::boolean)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_run_rls_smoke_tests() FROM anon;
