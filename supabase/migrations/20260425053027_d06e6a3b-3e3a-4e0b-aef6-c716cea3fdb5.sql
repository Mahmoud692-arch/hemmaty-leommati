-- ====== QUIZZES ======
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 10,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT false,
  attempt_policy TEXT NOT NULL DEFAULT 'strict_single', -- 'strict_single' or 'resume_allowed'
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_image TEXT,
  question_type TEXT NOT NULL DEFAULT 'mcq', -- 'mcq' or 'essay'
  options JSONB DEFAULT '[]'::jsonb, -- [{text, image}]
  correct_index INTEGER, -- for mcq
  points INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress', -- in_progress | submitted | expired | reopened
  score NUMERIC,
  max_score NUMERIC,
  time_spent_seconds INTEGER,
  needs_manual_grading BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(quiz_id, user_id) -- enforced at DB level; admin can delete to allow retry
);

CREATE TABLE public.quiz_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_index INTEGER,
  essay_text TEXT,
  is_correct BOOLEAN,
  awarded_points NUMERIC DEFAULT 0,
  graded_by UUID,
  graded_at TIMESTAMPTZ,
  UNIQUE(attempt_id, question_id)
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

-- quizzes
CREATE POLICY "الكويزات النشطة مرئية للمسجلين"
  ON public.quizzes FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "الإدارة تنشئ الكويزات"
  ON public.quizzes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "الإدارة تعدّل الكويزات"
  ON public.quizzes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "الإدارة تحذف الكويزات"
  ON public.quizzes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- quiz_questions: visible to authenticated when quiz is active; full access for admin
CREATE POLICY "أسئلة الكويز مرئية"
  ON public.quiz_questions FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND q.is_active = true)
  );
CREATE POLICY "الإدارة تدير أسئلة الكويز"
  ON public.quiz_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- quiz_attempts
CREATE POLICY "المستخدم يرى محاولاته والإدارة ترى الكل"
  ON public.quiz_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "المستخدم يبدأ محاولته"
  ON public.quiz_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "المستخدم يحدث محاولته الجارية والإدارة تحدث الكل"
  ON public.quiz_attempts FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (auth.uid() = user_id AND status = 'in_progress')
  );
CREATE POLICY "الإدارة تحذف المحاولات"
  ON public.quiz_attempts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- quiz_answers
CREATE POLICY "المستخدم يرى إجاباته والإدارة ترى الكل"
  ON public.quiz_answers FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.quiz_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid())
  );
CREATE POLICY "المستخدم يضيف إجاباته"
  ON public.quiz_answers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.quiz_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid() AND a.status = 'in_progress')
  );
CREATE POLICY "الإدارة تعدّل الإجابات (للتصحيح اليدوي)"
  ON public.quiz_answers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "الإدارة تحذف الإجابات"
  ON public.quiz_answers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- triggers updated_at
CREATE TRIGGER trg_quizzes_updated BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====== NOTIFICATIONS ======
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'info', -- info | success | warning | error | new_question | new_comment | quiz_result
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "المستخدم يرى إشعاراته والإدارة ترى الكل"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "الإدارة تنشئ الإشعارات"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);
CREATE POLICY "المستخدم يحدّث إشعاراته"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "المستخدم يحذف إشعاراته"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);

-- ====== AUDIT LOG ======
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL, -- create | update | delete | publish | grade | etc
  entity_type TEXT NOT NULL, -- article | hadith | quiz | user_role | settings | comment | ...
  entity_id TEXT,
  before_data JSONB,
  after_data JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "الإدارة ترى السجل"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "الإدارة تكتب السجل"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = actor_id);

CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_entity ON public.audit_log(entity_type, entity_id);

-- ====== SITE SETTINGS ======
CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "الإعدادات مرئية للجميع"
  ON public.site_settings FOR SELECT TO public USING (true);
CREATE POLICY "الإدارة تعدّل الإعدادات"
  ON public.site_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- seed defaults
INSERT INTO public.site_settings (key, value) VALUES
  ('site_name', '"همّتي لأمّتي"'::jsonb),
  ('site_description', '"منصة دينية توعوية متكاملة"'::jsonb),
  ('site_logo', '""'::jsonb),
  ('primary_color', '"#0e7c66"'::jsonb),
  ('accent_color', '"#d4a574"'::jsonb),
  ('font_heading', '"Cairo"'::jsonb),
  ('font_body', '"Tajawal"'::jsonb),
  ('comments_enabled', 'true'::jsonb),
  ('comments_require_approval', 'true'::jsonb),
  ('social_links', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ====== HOMEPAGE SECTIONS ======
CREATE TABLE public.homepage_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_type TEXT NOT NULL, -- text | cards | image | buttons | video | quotes | hero
  title TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "أقسام الرئيسية المرئية للجميع"
  ON public.homepage_sections FOR SELECT TO public
  USING (is_visible = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "الإدارة تدير أقسام الرئيسية"
  ON public.homepage_sections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_homepage_sections_updated BEFORE UPDATE ON public.homepage_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====== INTERACTIONS: LIKES, SAVES, COMMENTS ======
CREATE TABLE public.article_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  article_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, article_slug)
);
ALTER TABLE public.article_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "الإعجابات مرئية للجميع المسجلين"
  ON public.article_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "المستخدم يدير إعجاباته"
  ON public.article_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "المستخدم يحذف إعجابه"
  ON public.article_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.article_saves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  article_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, article_slug)
);
ALTER TABLE public.article_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "المستخدم يرى محفوظاته"
  ON public.article_saves FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "المستخدم يحفظ المقالات"
  ON public.article_saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "المستخدم يحذف المحفوظات"
  ON public.article_saves FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.article_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  article_slug TEXT NOT NULL,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  is_approved BOOLEAN NOT NULL DEFAULT false,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.article_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "التعليقات المعتمدة مرئية للجميع"
  ON public.article_comments FOR SELECT TO public
  USING ((is_approved = true AND is_hidden = false) OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "المستخدم يضيف تعليقاً"
  ON public.article_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "المستخدم يعدّل تعليقه والإدارة الكل"
  ON public.article_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "المستخدم يحذف تعليقه والإدارة الكل"
  ON public.article_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_article_comments_updated BEFORE UPDATE ON public.article_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_comments_article ON public.article_comments(article_slug, is_approved, is_hidden, created_at DESC);

-- ====== Quiz scoring helper (auto-grade MCQ) ======
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(_attempt_id UUID)
RETURNS TABLE(score NUMERIC, max_score NUMERIC, needs_manual BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_quiz UUID;
  v_started TIMESTAMPTZ;
  v_score NUMERIC := 0;
  v_max NUMERIC := 0;
  v_needs BOOLEAN := false;
BEGIN
  SELECT user_id, quiz_id, started_at INTO v_user, v_quiz, v_started
  FROM public.quiz_attempts WHERE id = _attempt_id;

  IF v_user IS NULL THEN RAISE EXCEPTION 'Attempt not found'; END IF;
  IF v_user <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- auto-grade mcq
  UPDATE public.quiz_answers a
  SET is_correct = (q.question_type = 'mcq' AND a.selected_index = q.correct_index),
      awarded_points = CASE
        WHEN q.question_type = 'mcq' AND a.selected_index = q.correct_index THEN q.points
        ELSE 0 END
  FROM public.quiz_questions q
  WHERE a.question_id = q.id AND a.attempt_id = _attempt_id;

  SELECT COALESCE(SUM(awarded_points), 0) INTO v_score
  FROM public.quiz_answers WHERE attempt_id = _attempt_id;

  SELECT COALESCE(SUM(points), 0) INTO v_max
  FROM public.quiz_questions WHERE quiz_id = v_quiz;

  SELECT EXISTS(
    SELECT 1 FROM public.quiz_answers a
    JOIN public.quiz_questions q ON q.id = a.question_id
    WHERE a.attempt_id = _attempt_id AND q.question_type = 'essay'
  ) INTO v_needs;

  UPDATE public.quiz_attempts
  SET status = 'submitted',
      submitted_at = now(),
      score = v_score,
      max_score = v_max,
      time_spent_seconds = EXTRACT(EPOCH FROM (now() - v_started))::int,
      needs_manual_grading = v_needs
  WHERE id = _attempt_id;

  RETURN QUERY SELECT v_score, v_max, v_needs;
END;
$$;