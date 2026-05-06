-- 1) Cleanup redundant SELECT policy on quiz_questions (admin ALL already covers it)
DROP POLICY IF EXISTS "quiz_questions: admin only SELECT" ON public.quiz_questions;

-- 2) Trigger: notify on new badge
CREATE OR REPLACE FUNCTION public.notify_new_badge()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (NEW.user_id, 'حصلتَ على شارة جديدة 🏅', 'افتح لوحة الإنجاز لرؤية شاراتك.', 'achievement', '/dashboard');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_new_badge ON public.user_badges;
CREATE TRIGGER trg_notify_new_badge
AFTER INSERT ON public.user_badges
FOR EACH ROW EXECUTE FUNCTION public.notify_new_badge();

-- 3) Trigger: broadcast on article publish
CREATE OR REPLACE FUNCTION public.notify_article_published()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status = 'published' AND COALESCE(OLD.status,'') <> 'published' THEN
    INSERT INTO public.notifications (user_id, title, message, link, type)
    SELECT user_id,
           'مقال جديد: ' || LEFT(NEW.title, 80),
           COALESCE(LEFT(NEW.excerpt, 140), 'افتح المقال للقراءة'),
           '/articles/' || NEW.slug,
           'info'
    FROM public.profiles
    WHERE last_seen_at IS NULL OR last_seen_at >= now() - interval '60 days';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_article_published ON public.articles;
CREATE TRIGGER trg_notify_article_published
AFTER INSERT OR UPDATE OF status ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.notify_article_published();

-- 4) Trigger: lesson completion → 5 points + notification (once per lesson)
CREATE OR REPLACE FUNCTION public.award_lesson_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.completed = true AND COALESCE(OLD.completed,false) = false THEN
    UPDATE public.profiles SET total_points = total_points + 5 WHERE user_id = NEW.user_id;
    INSERT INTO public.points_adjustments (user_id, delta, reason, created_by)
    VALUES (NEW.user_id, 5, 'lesson_completion', NEW.user_id);
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (NEW.user_id, 'أتممتَ درسًا — +5 نقاط 🎉', 'استمرّ في رحلتك الإيمانية.', 'success', '/lessons');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_award_lesson_completion ON public.lesson_progress;
CREATE TRIGGER trg_award_lesson_completion
AFTER INSERT OR UPDATE OF completed ON public.lesson_progress
FOR EACH ROW EXECUTE FUNCTION public.award_lesson_completion();

-- 5) RPC: grant_badge_to_user (admin only, can't grant self)
CREATE OR REPLACE FUNCTION public.admin_grant_badge(_target_user uuid, _badge_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _target_user = auth.uid() THEN RAISE EXCEPTION 'لا يمكن منح نفسك شارة'; END IF;
  IF _target_user IS NULL OR _badge_key IS NULL OR length(trim(_badge_key))=0 THEN
    RAISE EXCEPTION 'بيانات غير صالحة'; END IF;
  INSERT INTO public.user_badges (user_id, badge_key) VALUES (_target_user, _badge_key)
  ON CONFLICT DO NOTHING;
  INSERT INTO public.audit_log (actor_id, actor_email, action, entity_type, entity_id, after_data)
  VALUES (auth.uid(),(SELECT email FROM auth.users WHERE id=auth.uid()),
          'grant_badge','user_badges',_target_user::text,jsonb_build_object('badge_key',_badge_key));
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.admin_revoke_badge(_target_user uuid, _badge_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM public.user_badges WHERE user_id=_target_user AND badge_key=_badge_key;
  INSERT INTO public.audit_log (actor_id, actor_email, action, entity_type, entity_id, after_data)
  VALUES (auth.uid(),(SELECT email FROM auth.users WHERE id=auth.uid()),
          'revoke_badge','user_badges',_target_user::text,jsonb_build_object('badge_key',_badge_key));
  RETURN true;
END $$;

-- 6) RPC: bulk import articles as drafts
CREATE OR REPLACE FUNCTION public.admin_bulk_import_articles(_items jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_count int := 0; v_item jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(_items,'[]'::jsonb))
  LOOP
    INSERT INTO public.articles (slug,title,excerpt,content,category,read_minutes,status,is_published,author)
    VALUES (
      v_item->>'slug', v_item->>'title', v_item->>'excerpt',
      v_item->>'content', v_item->>'category',
      COALESCE((v_item->>'read_minutes')::int,5),
      'draft', false,
      COALESCE(v_item->>'author','إدارة الموقع')
    ) ON CONFLICT (slug) DO NOTHING;
    v_count := v_count + 1;
  END LOOP;
  INSERT INTO public.audit_log (actor_id,actor_email,action,entity_type,after_data)
  VALUES (auth.uid(),(SELECT email FROM auth.users WHERE id=auth.uid()),
          'bulk_import_articles','article',jsonb_build_object('count',v_count));
  RETURN v_count;
END $$;

-- 7) RPC: upsert quote
CREATE OR REPLACE FUNCTION public.admin_upsert_quote(_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _payload ? 'id' AND (_payload->>'id')<>'' THEN
    UPDATE public.quotes SET
      text=COALESCE(_payload->>'text',text),
      source=COALESCE(_payload->>'source',source),
      type=COALESCE(_payload->>'type',type),
      is_published=COALESCE((_payload->>'is_published')::bool,is_published),
      updated_at=now()
    WHERE id=(_payload->>'id')::uuid RETURNING id INTO v_id;
  ELSE
    INSERT INTO public.quotes (text,source,type,is_published)
    VALUES (_payload->>'text',_payload->>'source',
      COALESCE(_payload->>'type','wisdom'),
      COALESCE((_payload->>'is_published')::bool,true))
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END $$;