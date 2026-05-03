
-- ============ 1) Auto level recalculation ============
CREATE OR REPLACE FUNCTION public.recalc_profile_level()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.level := CASE
    WHEN NEW.total_points >= 2000 THEN 4
    WHEN NEW.total_points >= 1000 THEN 3
    WHEN NEW.total_points >=  500 THEN 2
    ELSE 1
  END;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS recalc_profile_level_trg ON public.profiles;
CREATE TRIGGER recalc_profile_level_trg
BEFORE INSERT OR UPDATE OF total_points ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.recalc_profile_level();

-- Backfill once
UPDATE public.profiles SET total_points = total_points;

-- ============ 2) Quiz pass → points + counter ============
CREATE OR REPLACE FUNCTION public.award_quiz_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pct numeric;
BEGIN
  IF NEW.status = 'submitted' AND COALESCE(OLD.status,'') <> 'submitted'
     AND NEW.max_score IS NOT NULL AND NEW.max_score > 0 THEN
    v_pct := (NEW.score / NEW.max_score) * 100;
    IF v_pct >= 60 THEN
      UPDATE public.profiles
      SET total_points = total_points + 20,
          quizzes_passed = quizzes_passed + 1
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS award_quiz_points_trg ON public.quiz_attempts;
CREATE TRIGGER award_quiz_points_trg
AFTER UPDATE OF status, score, max_score ON public.quiz_attempts
FOR EACH ROW EXECUTE FUNCTION public.award_quiz_points();

-- ============ 3) Hadith read → +5 points ============
CREATE OR REPLACE FUNCTION public.award_hadith_read()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only first read per (user, hadith) thanks to unique-ish insert pattern; guard with NOT EXISTS
  IF NOT EXISTS (
    SELECT 1 FROM public.hadith_reads
    WHERE user_id = NEW.user_id AND hadith_number = NEW.hadith_number AND id <> NEW.id
  ) THEN
    UPDATE public.profiles
    SET total_points = total_points + 5,
        hadiths_read = hadiths_read + 1
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS award_hadith_read_trg ON public.hadith_reads;
CREATE TRIGGER award_hadith_read_trg
AFTER INSERT ON public.hadith_reads
FOR EACH ROW EXECUTE FUNCTION public.award_hadith_read();

-- ============ 4) Hardened award_badge (double check) ============
CREATE OR REPLACE FUNCTION public.award_badge(_user_id uuid, _badge_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Forbidden: authentication required';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  IF _user_id IS NULL OR _badge_key IS NULL OR length(trim(_badge_key)) = 0 THEN
    RAISE EXCEPTION 'Invalid arguments';
  END IF;
  INSERT INTO public.user_badges (user_id, badge_key)
  VALUES (_user_id, _badge_key)
  ON CONFLICT DO NOTHING;
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.award_badge(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_badge(uuid, text) TO authenticated;

-- ============ 5) Extended RLS smoke tests for form_submissions ============
CREATE OR REPLACE FUNCTION public.admin_run_rls_smoke_tests()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_results jsonb := '[]'::jsonb;
  v_pass boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- profiles
  SELECT relrowsecurity INTO v_pass FROM pg_class WHERE oid='public.profiles'::regclass;
  v_results := v_results || jsonb_build_object('name','profiles: RLS مفعّل','pass',COALESCE(v_pass,false),'detail','حماية الملفات الشخصية');

  SELECT NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND cmd='SELECT' AND qual='true') INTO v_pass;
  v_results := v_results || jsonb_build_object('name','profiles: لا تسرّب بيانات للجميع','pass',v_pass,'detail','لا توجد سياسة SELECT مفتوحة');

  -- user_badges
  SELECT relrowsecurity INTO v_pass FROM pg_class WHERE oid='public.user_badges'::regclass;
  v_results := v_results || jsonb_build_object('name','user_badges: RLS مفعّل','pass',COALESCE(v_pass,false),'detail','حماية الشارات');

  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_badges' AND cmd='INSERT' AND with_check LIKE '%has_role%') INTO v_pass;
  v_results := v_results || jsonb_build_object('name','user_badges: INSERT للأدمن فقط','pass',v_pass,'detail','منع المستخدم من منح نفسه شارات');

  -- quiz_questions_safe
  SELECT EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='quiz_questions_safe') INTO v_pass;
  v_results := v_results || jsonb_build_object('name','quiz_questions_safe: View آمن موجود','pass',v_pass,'detail','يخفي correct_index');

  SELECT NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quiz_questions' AND cmd='SELECT' AND qual NOT LIKE '%has_role%' AND qual NOT LIKE '%quizzes%') INTO v_pass;
  v_results := v_results || jsonb_build_object('name','quiz_questions: لا تكشف الإجابات','pass',v_pass,'detail','SELECT مقيّد');

  -- form_submissions tests (NEW)
  SELECT relrowsecurity INTO v_pass FROM pg_class WHERE oid='public.form_submissions'::regclass;
  v_results := v_results || jsonb_build_object('name','form_submissions: RLS مفعّل','pass',COALESCE(v_pass,false),'detail','حماية ردود النماذج');

  SELECT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='form_submissions' AND cmd='INSERT'
    AND with_check LIKE '%auth.uid()%' AND with_check LIKE '%user_id%'
  ) INTO v_pass;
  v_results := v_results || jsonb_build_object('name','form_submissions: INSERT يلزم user_id=auth.uid()','pass',v_pass,'detail','منع التزوير وانتحال هوية');

  SELECT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='form_submissions' AND cmd='SELECT'
    AND qual LIKE '%auth.uid()%' AND qual LIKE '%has_role%'
  ) INTO v_pass;
  v_results := v_results || jsonb_build_object('name','form_submissions: SELECT للمالك أو الأدمن','pass',v_pass,'detail','لا يصل أحد لردود غيره');

  -- award_badge double-check
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='award_badge'
      AND pg_get_functiondef(p.oid) LIKE '%has_role%' AND pg_get_functiondef(p.oid) LIKE '%admin only%'
  ) INTO v_pass;
  v_results := v_results || jsonb_build_object('name','award_badge: تحقق مزدوج للأدمن','pass',v_pass,'detail','الدالة ترفع استثناء لغير الأدمن');

  -- storage RLS active
  SELECT relrowsecurity INTO v_pass FROM pg_class WHERE oid='storage.objects'::regclass;
  v_results := v_results || jsonb_build_object('name','storage.objects: RLS مفعّل','pass',COALESCE(v_pass,false),'detail','حماية الملفات');

  RETURN jsonb_build_object(
    'tested_at', now(),
    'tester_email', (SELECT email FROM auth.users WHERE id = auth.uid()),
    'results', v_results,
    'total', jsonb_array_length(v_results),
    'passed', (SELECT count(*) FROM jsonb_array_elements(v_results) e WHERE (e->>'pass')::boolean)
  );
END; $$;
REVOKE ALL ON FUNCTION public.admin_run_rls_smoke_tests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_run_rls_smoke_tests() TO authenticated;
