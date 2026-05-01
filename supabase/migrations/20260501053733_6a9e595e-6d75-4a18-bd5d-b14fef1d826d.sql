
-- =========================================================
-- PART A: SECURITY FIXES
-- =========================================================

-- 1) Recreate views as SECURITY INVOKER (Postgres 15+)
DROP VIEW IF EXISTS public.profiles_public CASCADE;
CREATE VIEW public.profiles_public WITH (security_invoker = true) AS
SELECT id, user_id, full_name, avatar_url, country, level,
       total_points, articles_read, hadiths_read, quizzes_passed,
       created_at, updated_at
FROM public.profiles;
GRANT SELECT ON public.profiles_public TO authenticated, anon;

DROP VIEW IF EXISTS public.quiz_questions_safe CASCADE;
CREATE VIEW public.quiz_questions_safe WITH (security_invoker = true) AS
SELECT id, quiz_id, question_text, question_image, question_type,
       options, points, order_index, created_at
FROM public.quiz_questions;
GRANT SELECT ON public.quiz_questions_safe TO authenticated;

-- Allow authenticated users to read questions of active quizzes via the safe view
DROP POLICY IF EXISTS "أسئلة الكويز النشطة للمسجلين عبر الـ view" ON public.quiz_questions;
CREATE POLICY "أسئلة الكويز النشطة للمسجلين عبر الـ view"
ON public.quiz_questions FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = quiz_questions.quiz_id AND q.is_active = true
  )
);

-- 2) Anonymous user_questions: hide user_id via a safe view + restrict policy
DROP POLICY IF EXISTS "الأسئلة المنشورة مرئية للجميع الم" ON public.user_questions;
CREATE POLICY "أسئلة المستخدم: المالك والإدارة فقط ترى الكامل"
ON public.user_questions FOR SELECT TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

DROP VIEW IF EXISTS public.user_questions_public CASCADE;
CREATE VIEW public.user_questions_public WITH (security_invoker = true) AS
SELECT id,
       CASE WHEN is_anonymous THEN NULL ELSE user_id END AS user_id,
       is_anonymous, question, answer, answered_at, is_published,
       created_at, updated_at
FROM public.user_questions
WHERE is_published = true;
GRANT SELECT ON public.user_questions_public TO authenticated, anon;

-- 3) Revoke EXECUTE from anon/PUBLIC on admin SECURITY DEFINER functions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef = true
      AND p.proname LIKE 'admin_%'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', r.proname, r.args);
  END LOOP;
END $$;

-- =========================================================
-- PART B: DYNAMIC CONTENT ENGINE
-- =========================================================
CREATE TABLE IF NOT EXISTS public.dynamic_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  slug text UNIQUE,
  title text NOT NULL,
  body jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft', -- draft|scheduled|published|archived
  scheduled_at timestamptz,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dynamic_content_type_status ON public.dynamic_content(content_type, status);
ALTER TABLE public.dynamic_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "المحتوى المنشور للجميع" ON public.dynamic_content FOR SELECT TO public
  USING (status='published' OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "الأدمن يدير المحتوى" ON public.dynamic_content FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- =========================================================
-- PART C: PROGRAMS / JOURNEYS ENGINE
-- =========================================================
CREATE TABLE IF NOT EXISTS public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  cover_image text,
  program_type text NOT NULL DEFAULT 'journey', -- journey|quran_plan|challenge|habit|routine
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.program_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  order_index int NOT NULL DEFAULT 0,
  title text NOT NULL,
  body jsonb NOT NULL DEFAULT '{}'::jsonb,
  required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.program_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active', -- active|completed|dropped
  progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(program_id, user_id)
);
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "البرامج المنشورة للجميع" ON public.programs FOR SELECT TO public
  USING (is_published OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "الأدمن يدير البرامج" ON public.programs FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "خطوات البرامج للجميع" ON public.program_steps FOR SELECT TO public USING (true);
CREATE POLICY "الأدمن يدير خطوات البرامج" ON public.program_steps FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "المستخدم يرى تسجيلاته" ON public.program_enrollments FOR SELECT TO authenticated
  USING (auth.uid()=user_id OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "المستخدم يسجّل في برنامج" ON public.program_enrollments FOR INSERT TO authenticated
  WITH CHECK (auth.uid()=user_id);
CREATE POLICY "المستخدم يحدّث تقدّمه" ON public.program_enrollments FOR UPDATE TO authenticated
  USING (auth.uid()=user_id OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "الأدمن يحذف التسجيلات" ON public.program_enrollments FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

-- =========================================================
-- PART D: AUTOMATION RULES
-- =========================================================
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_event text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "الأدمن يدير قواعد الأتمتة" ON public.automation_rules FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- =========================================================
-- PART E: INTERACTIVE FORMS BUILDER
-- =========================================================
CREATE TABLE IF NOT EXISTS public.interactive_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  form_type text NOT NULL DEFAULT 'survey', -- survey|feedback|quiz|application|assessment
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.interactive_forms(id) ON DELETE CASCADE,
  user_id uuid,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.interactive_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "النماذج المنشورة للجميع" ON public.interactive_forms FOR SELECT TO public
  USING (is_published OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "الأدمن يدير النماذج" ON public.interactive_forms FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "المستخدم يرسل ردوده" ON public.form_submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid()=user_id OR user_id IS NULL);
CREATE POLICY "المستخدم يرى ردوده والإدارة الكل" ON public.form_submissions FOR SELECT TO authenticated
  USING (auth.uid()=user_id OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "الأدمن يحذف الردود" ON public.form_submissions FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

-- =========================================================
-- PART F: TAXONOMY ENGINE
-- =========================================================
CREATE TABLE IF NOT EXISTS public.taxonomies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.taxonomy_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  taxonomy_id uuid NOT NULL REFERENCES public.taxonomies(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.taxonomy_items(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  UNIQUE (taxonomy_id, slug)
);
CREATE TABLE IF NOT EXISTS public.entity_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  taxonomy_item_id uuid NOT NULL REFERENCES public.taxonomy_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, taxonomy_item_id)
);
ALTER TABLE public.taxonomies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "التصنيفات للجميع" ON public.taxonomies FOR SELECT TO public USING (true);
CREATE POLICY "الأدمن يدير التصنيفات" ON public.taxonomies FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "عناصر التصنيف للجميع" ON public.taxonomy_items FOR SELECT TO public USING (true);
CREATE POLICY "الأدمن يدير عناصر التصنيف" ON public.taxonomy_items FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "وسوم الكيانات للجميع" ON public.entity_tags FOR SELECT TO public USING (true);
CREATE POLICY "الأدمن يدير وسوم الكيانات" ON public.entity_tags FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- =========================================================
-- PART G: ACHIEVEMENTS / REWARDS RULES
-- =========================================================
CREATE TABLE IF NOT EXISTS public.achievement_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_event text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  reward jsonb NOT NULL DEFAULT '{}'::jsonb, -- {points:int, badge_key:text}
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.achievement_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "الأدمن يدير قواعد الإنجازات" ON public.achievement_rules FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- =========================================================
-- PART H: GENERIC RPCs (used by both AI assistant + admin UI)
-- =========================================================

CREATE OR REPLACE FUNCTION public.admin_upsert_dynamic_content(_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _payload ? 'id' AND (_payload->>'id') <> '' THEN
    UPDATE public.dynamic_content SET
      content_type=COALESCE(_payload->>'content_type',content_type),
      slug=COALESCE(_payload->>'slug',slug),
      title=COALESCE(_payload->>'title',title),
      body=COALESCE(_payload->'body',body),
      metadata=COALESCE(_payload->'metadata',metadata),
      status=COALESCE(_payload->>'status',status),
      scheduled_at=NULLIF(_payload->>'scheduled_at','')::timestamptz,
      published_at=CASE WHEN COALESCE(_payload->>'status',status)='published' AND published_at IS NULL THEN now() ELSE published_at END,
      updated_at=now()
    WHERE id=(_payload->>'id')::uuid RETURNING id INTO v_id;
  ELSE
    INSERT INTO public.dynamic_content (content_type, slug, title, body, metadata, status, scheduled_at, published_at, created_by)
    VALUES (
      _payload->>'content_type', _payload->>'slug', _payload->>'title',
      COALESCE(_payload->'body','{}'::jsonb), COALESCE(_payload->'metadata','{}'::jsonb),
      COALESCE(_payload->>'status','draft'),
      NULLIF(_payload->>'scheduled_at','')::timestamptz,
      CASE WHEN COALESCE(_payload->>'status','draft')='published' THEN now() ELSE NULL END,
      auth.uid()
    ) RETURNING id INTO v_id;
  END IF;
  INSERT INTO public.audit_log (actor_id,actor_email,action,entity_type,entity_id,after_data)
  VALUES (auth.uid(),(SELECT email FROM auth.users WHERE id=auth.uid()),
          'upsert_dynamic_content','dynamic_content',v_id::text,_payload);
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_dynamic_content(_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM public.dynamic_content WHERE id=_id;
  INSERT INTO public.audit_log (actor_id,actor_email,action,entity_type,entity_id)
  VALUES (auth.uid(),(SELECT email FROM auth.users WHERE id=auth.uid()),'delete_dynamic_content','dynamic_content',_id::text);
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.admin_upsert_program(_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _payload ? 'id' AND (_payload->>'id')<>'' THEN
    UPDATE public.programs SET
      slug=COALESCE(_payload->>'slug',slug),
      title=COALESCE(_payload->>'title',title),
      description=COALESCE(_payload->>'description',description),
      cover_image=COALESCE(_payload->>'cover_image',cover_image),
      program_type=COALESCE(_payload->>'program_type',program_type),
      config=COALESCE(_payload->'config',config),
      is_published=COALESCE((_payload->>'is_published')::bool,is_published),
      updated_at=now()
    WHERE id=(_payload->>'id')::uuid RETURNING id INTO v_id;
  ELSE
    INSERT INTO public.programs (slug,title,description,cover_image,program_type,config,is_published)
    VALUES (
      _payload->>'slug', _payload->>'title', _payload->>'description',
      _payload->>'cover_image', COALESCE(_payload->>'program_type','journey'),
      COALESCE(_payload->'config','{}'::jsonb),
      COALESCE((_payload->>'is_published')::bool,false)
    ) RETURNING id INTO v_id;
  END IF;
  INSERT INTO public.audit_log (actor_id,actor_email,action,entity_type,entity_id,after_data)
  VALUES (auth.uid(),(SELECT email FROM auth.users WHERE id=auth.uid()),'upsert_program','program',v_id::text,_payload);
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_assign_program(_program_id uuid, _user_ids uuid[])
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_count int := 0; v_uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  FOREACH v_uid IN ARRAY _user_ids LOOP
    INSERT INTO public.program_enrollments (program_id, user_id) VALUES (_program_id, v_uid)
    ON CONFLICT (program_id,user_id) DO NOTHING;
    v_count := v_count + 1;
  END LOOP;
  INSERT INTO public.audit_log (actor_id,actor_email,action,entity_type,entity_id,after_data)
  VALUES (auth.uid(),(SELECT email FROM auth.users WHERE id=auth.uid()),'assign_program','program',_program_id::text,
          jsonb_build_object('users_count', v_count));
  RETURN v_count;
END $$;

CREATE OR REPLACE FUNCTION public.admin_upsert_form(_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _payload ? 'id' AND (_payload->>'id')<>'' THEN
    UPDATE public.interactive_forms SET
      slug=COALESCE(_payload->>'slug',slug),
      title=COALESCE(_payload->>'title',title),
      description=COALESCE(_payload->>'description',description),
      form_type=COALESCE(_payload->>'form_type',form_type),
      fields=COALESCE(_payload->'fields',fields),
      settings=COALESCE(_payload->'settings',settings),
      is_published=COALESCE((_payload->>'is_published')::bool,is_published),
      updated_at=now()
    WHERE id=(_payload->>'id')::uuid RETURNING id INTO v_id;
  ELSE
    INSERT INTO public.interactive_forms (slug,title,description,form_type,fields,settings,is_published)
    VALUES (
      _payload->>'slug', _payload->>'title', _payload->>'description',
      COALESCE(_payload->>'form_type','survey'),
      COALESCE(_payload->'fields','[]'::jsonb),
      COALESCE(_payload->'settings','{}'::jsonb),
      COALESCE((_payload->>'is_published')::bool,false)
    ) RETURNING id INTO v_id;
  END IF;
  INSERT INTO public.audit_log (actor_id,actor_email,action,entity_type,entity_id,after_data)
  VALUES (auth.uid(),(SELECT email FROM auth.users WHERE id=auth.uid()),'upsert_form','interactive_form',v_id::text,_payload);
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_upsert_taxonomy(_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _payload ? 'id' AND (_payload->>'id')<>'' THEN
    UPDATE public.taxonomies SET slug=COALESCE(_payload->>'slug',slug),
      name=COALESCE(_payload->>'name',name), description=COALESCE(_payload->>'description',description)
    WHERE id=(_payload->>'id')::uuid RETURNING id INTO v_id;
  ELSE
    INSERT INTO public.taxonomies (slug,name,description)
    VALUES (_payload->>'slug',_payload->>'name',_payload->>'description') RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_assign_tag(_entity_type text, _entity_id text, _taxonomy_item_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.entity_tags (entity_type,entity_id,taxonomy_item_id)
  VALUES (_entity_type,_entity_id,_taxonomy_item_id)
  ON CONFLICT DO NOTHING RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_upsert_achievement_rule(_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _payload ? 'id' AND (_payload->>'id')<>'' THEN
    UPDATE public.achievement_rules SET
      name=COALESCE(_payload->>'name',name),
      description=COALESCE(_payload->>'description',description),
      trigger_event=COALESCE(_payload->>'trigger_event',trigger_event),
      conditions=COALESCE(_payload->'conditions',conditions),
      reward=COALESCE(_payload->'reward',reward),
      is_active=COALESCE((_payload->>'is_active')::bool,is_active)
    WHERE id=(_payload->>'id')::uuid RETURNING id INTO v_id;
  ELSE
    INSERT INTO public.achievement_rules (name,description,trigger_event,conditions,reward,is_active)
    VALUES (_payload->>'name',_payload->>'description',_payload->>'trigger_event',
      COALESCE(_payload->'conditions','{}'::jsonb), COALESCE(_payload->'reward','{}'::jsonb),
      COALESCE((_payload->>'is_active')::bool,true)) RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_upsert_automation(_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _payload ? 'id' AND (_payload->>'id')<>'' THEN
    UPDATE public.automation_rules SET
      name=COALESCE(_payload->>'name',name),
      trigger_event=COALESCE(_payload->>'trigger_event',trigger_event),
      conditions=COALESCE(_payload->'conditions',conditions),
      actions=COALESCE(_payload->'actions',actions),
      is_active=COALESCE((_payload->>'is_active')::bool,is_active)
    WHERE id=(_payload->>'id')::uuid RETURNING id INTO v_id;
  ELSE
    INSERT INTO public.automation_rules (name,trigger_event,conditions,actions,is_active,created_by)
    VALUES (_payload->>'name',_payload->>'trigger_event',
      COALESCE(_payload->'conditions','{}'::jsonb), COALESCE(_payload->'actions','[]'::jsonb),
      COALESCE((_payload->>'is_active')::bool,true), auth.uid()) RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END $$;

-- =========================================================
-- PART I: ENGAGEMENT METRICS
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_engagement_metrics(_days int DEFAULT 7)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_build_object(
    'days', _days,
    'new_users', (SELECT COUNT(*) FROM public.profiles WHERE created_at >= now() - (_days||' days')::interval),
    'active_readers', (SELECT COUNT(DISTINCT user_id) FROM public.article_reads WHERE read_at >= now() - (_days||' days')::interval),
    'total_reads', (SELECT COUNT(*) FROM public.article_reads WHERE read_at >= now() - (_days||' days')::interval),
    'total_comments', (SELECT COUNT(*) FROM public.article_comments WHERE created_at >= now() - (_days||' days')::interval),
    'total_quiz_attempts', (SELECT COUNT(*) FROM public.quiz_attempts WHERE started_at >= now() - (_days||' days')::interval),
    'top_articles', (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM (
        SELECT article_slug, COUNT(*) AS reads FROM public.article_reads
        WHERE read_at >= now() - (_days||' days')::interval
        GROUP BY article_slug ORDER BY reads DESC LIMIT 5
      ) x)
  ) INTO v;
  RETURN v;
END $$;

-- Grant execute to authenticated only (admin gate inside)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef = true AND p.proname LIKE 'admin_%'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', r.proname, r.args);
  END LOOP;
END $$;
