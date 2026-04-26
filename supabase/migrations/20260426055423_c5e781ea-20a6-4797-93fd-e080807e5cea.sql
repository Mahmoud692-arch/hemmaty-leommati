
-- 1) Unique constraints to prevent duplicates that break maybeSingle()
CREATE UNIQUE INDEX IF NOT EXISTS quiz_attempts_user_quiz_uniq
  ON public.quiz_attempts (quiz_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS quiz_answers_attempt_question_uniq
  ON public.quiz_answers (attempt_id, question_id);

-- 2) Email confirmation helper (security definer to read auth.users)
CREATE OR REPLACE FUNCTION public.is_email_confirmed(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id
      AND email_confirmed_at IS NOT NULL
  );
$$;

-- 3) Tighten RLS: only confirmed users may insert questions / comments / start attempts
DROP POLICY IF EXISTS "المستخدم يطرح أسئلة" ON public.user_questions;
CREATE POLICY "المستخدم يطرح أسئلة (مؤكد)"
ON public.user_questions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_email_confirmed(auth.uid()));

DROP POLICY IF EXISTS "المستخدم يضيف تعليقاً" ON public.article_comments;
CREATE POLICY "المستخدم يضيف تعليقاً (مؤكد)"
ON public.article_comments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_email_confirmed(auth.uid()));

DROP POLICY IF EXISTS "المستخدم يبدأ محاولته" ON public.quiz_attempts;
CREATE POLICY "المستخدم يبدأ محاولته (مؤكد)"
ON public.quiz_attempts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_email_confirmed(auth.uid()));

-- 4) Bulk creation RPCs for the AI assistant
CREATE OR REPLACE FUNCTION public.admin_create_article(_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  INSERT INTO public.articles (
    slug, title, excerpt, content, cover_image, author, category,
    read_minutes, status, is_published, scheduled_at
  )
  VALUES (
    _payload->>'slug',
    _payload->>'title',
    _payload->>'excerpt',
    _payload->>'content',
    _payload->>'cover_image',
    COALESCE(_payload->>'author', 'إدارة الموقع'),
    _payload->>'category',
    COALESCE((_payload->>'read_minutes')::int, 5),
    COALESCE(_payload->>'status', 'draft'),
    COALESCE(_payload->>'status','draft') = 'published',
    NULLIF(_payload->>'scheduled_at','')::timestamptz
  )
  RETURNING id INTO v_id;

  INSERT INTO public.audit_log (actor_id, actor_email, action, entity_type, entity_id, after_data)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()),
          'create_via_ai', 'article', v_id::text, _payload);

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_hadith(_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_num int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_num := COALESCE((_payload->>'number')::int,
                    (SELECT COALESCE(MAX(number),0)+1 FROM public.hadiths));

  INSERT INTO public.hadiths (number, arabic_text, narrator, source, explanation, benefit, category, is_published)
  VALUES (
    v_num,
    _payload->>'arabic_text',
    _payload->>'narrator',
    _payload->>'source',
    _payload->>'explanation',
    _payload->>'benefit',
    _payload->>'category',
    COALESCE((_payload->>'is_published')::boolean, true)
  )
  RETURNING id INTO v_id;

  INSERT INTO public.audit_log (actor_id, actor_email, action, entity_type, entity_id, after_data)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()),
          'create_via_ai', 'hadith', v_id::text, _payload);

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_quiz_with_questions(_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_q jsonb;
  v_idx int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO public.quizzes (title, description, duration_minutes, attempt_policy, is_active, created_by)
  VALUES (
    _payload->>'title',
    _payload->>'description',
    COALESCE((_payload->>'duration_minutes')::int, 10),
    COALESCE(_payload->>'attempt_policy', 'strict_single'),
    COALESCE((_payload->>'is_active')::boolean, false),
    auth.uid()
  )
  RETURNING id INTO v_id;

  FOR v_q IN SELECT * FROM jsonb_array_elements(COALESCE(_payload->'questions','[]'::jsonb))
  LOOP
    INSERT INTO public.quiz_questions (quiz_id, question_text, question_type, options, correct_index, points, order_index)
    VALUES (
      v_id,
      v_q->>'question_text',
      COALESCE(v_q->>'question_type', 'mcq'),
      COALESCE(v_q->'options', '[]'::jsonb),
      NULLIF(v_q->>'correct_index','')::int,
      COALESCE((v_q->>'points')::int, 1),
      v_idx
    );
    v_idx := v_idx + 1;
  END LOOP;

  INSERT INTO public.audit_log (actor_id, actor_email, action, entity_type, entity_id, after_data)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()),
          'create_via_ai', 'quiz', v_id::text, _payload);

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_broadcast_notification(_title text, _message text, _link text DEFAULT NULL)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  INSERT INTO public.notifications (user_id, title, message, link, type)
  SELECT user_id, _title, _message, _link, 'broadcast' FROM public.profiles;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.audit_log (actor_id, actor_email, action, entity_type, after_data)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()),
          'broadcast', 'notification', jsonb_build_object('count', v_count, 'title', _title));

  RETURN v_count;
END;
$$;
