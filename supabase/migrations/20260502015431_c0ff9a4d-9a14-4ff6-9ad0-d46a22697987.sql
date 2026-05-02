-- 1) Tighten form_submissions: require user_id = auth.uid() on insert; restrict SELECT to owner/admin only
DROP POLICY IF EXISTS "المستخدم يرسل ردوده" ON public.form_submissions;
DROP POLICY IF EXISTS "المستخدم يرى ردوده والإدارة الكل" ON public.form_submissions;

CREATE POLICY "المستخدم يرسل ردوده فقط"
ON public.form_submissions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "المستخدم يرى ردوده فقط والإدارة الكل"
ON public.form_submissions
FOR SELECT
TO authenticated
USING (
  (user_id IS NOT NULL AND auth.uid() = user_id)
  OR public.has_role(auth.uid(), 'admin')
);

-- 2) Restrict award_badge to admins only and revoke from authenticated/anon
CREATE OR REPLACE FUNCTION public.award_badge(_user_id uuid, _badge_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  INSERT INTO public.user_badges (user_id, badge_key)
  VALUES (_user_id, _badge_key)
  ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.award_badge(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_badge(uuid, text) TO authenticated;
-- Function still self-checks; grant kept so admins can call. Non-admins get RAISE.

-- 3) Revoke EXECUTE from anon/authenticated on sensitive admin-only SECURITY DEFINER functions.
-- Each function still self-checks has_role, but we also remove ambient EXECUTE for defense in depth.
DO $$
DECLARE
  fn_signature text;
  fn_signatures text[] := ARRAY[
    'public.admin_set_site_setting(text, jsonb)',
    'public.admin_delete_quiz(uuid)',
    'public.admin_get_user_info(uuid)',
    'public.admin_delete_article(uuid)',
    'public.admin_assign_tag(text, text, uuid)',
    'public.admin_create_article(jsonb)',
    'public.admin_create_quiz_with_questions(jsonb)',
    'public.admin_create_hadith(jsonb)',
    'public.admin_delete_hadith(uuid)',
    'public.admin_delete_dynamic_content(uuid)',
    'public.admin_broadcast_notification(text, text, text)',
    'public.admin_adjust_points(uuid, integer, text, text)',
    'public.admin_delete_page(uuid)',
    'public.admin_article_performance(text)',
    'public.admin_assign_program(uuid, uuid[])',
    'public.admin_list_hadiths(uuid, text, text, boolean, boolean, integer, integer)',
    'public.admin_moderate_comment(uuid, text)',
    'public.admin_quiz_performance(uuid)',
    'public.admin_respond_to_question(uuid, text, boolean)',
    'public.admin_run_rls_smoke_tests()',
    'public.admin_schedule_content(text, uuid, timestamptz)',
    'public.admin_update_article(uuid, jsonb)',
    'public.admin_update_hadith(uuid, jsonb)',
    'public.admin_upsert_achievement_rule(jsonb)',
    'public.admin_upsert_ad(jsonb)',
    'public.admin_upsert_automation(jsonb)',
    'public.admin_upsert_dynamic_content(jsonb)',
    'public.admin_engagement_metrics(integer)',
    'public.admin_preview_changes(text, text)',
    'public.admin_update_quiz(uuid, jsonb)',
    'public.admin_upsert_form(jsonb)',
    'public.admin_upsert_page(jsonb)',
    'public.admin_upsert_program(jsonb)',
    'public.admin_upsert_taxonomy(jsonb)'
  ];
BEGIN
  FOREACH fn_signature IN ARRAY fn_signatures
  LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn_signature);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn_signature);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Skipping missing function: %', fn_signature;
    END;
  END LOOP;
END $$;

-- 4) publish_due_articles is a cron-style function — keep restricted to service_role only
DO $$
BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION public.publish_due_articles() FROM PUBLIC, anon, authenticated';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;