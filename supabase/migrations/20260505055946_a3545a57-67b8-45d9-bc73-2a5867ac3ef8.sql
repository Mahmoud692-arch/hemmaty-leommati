-- avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars','avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- policies for avatars (folder = user_id)
DO $$ BEGIN
  CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "avatars_user_insert" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "avatars_user_update" ON storage.objects FOR UPDATE
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "avatars_user_delete" ON storage.objects FOR DELETE
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- indexes
CREATE INDEX IF NOT EXISTS idx_last_visits_user_visited ON public.last_visits(user_id, visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_lessons_published ON public.lessons(status, order_index);
CREATE INDEX IF NOT EXISTS idx_stories_published ON public.prophet_stories(is_published, order_index);

-- admin upserts for new entities
CREATE OR REPLACE FUNCTION public.admin_upsert_prophet_story(_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _payload ? 'id' AND (_payload->>'id') <> '' THEN
    UPDATE public.prophet_stories SET
      slug=COALESCE(_payload->>'slug',slug),
      title=COALESCE(_payload->>'title',title),
      excerpt=COALESCE(_payload->>'excerpt',excerpt),
      content=COALESCE(_payload->>'content',content),
      cover_image=COALESCE(_payload->>'cover_image',cover_image),
      prophet_name=COALESCE(_payload->>'prophet_name',prophet_name),
      order_index=COALESCE((_payload->>'order_index')::int,order_index),
      is_published=COALESCE((_payload->>'is_published')::bool,is_published),
      updated_at=now()
    WHERE id=(_payload->>'id')::uuid RETURNING id INTO v_id;
  ELSE
    INSERT INTO public.prophet_stories (slug,title,excerpt,content,cover_image,prophet_name,order_index,is_published)
    VALUES (_payload->>'slug',_payload->>'title',_payload->>'excerpt',_payload->>'content',
      _payload->>'cover_image',_payload->>'prophet_name',
      COALESCE((_payload->>'order_index')::int,0),
      COALESCE((_payload->>'is_published')::bool,false))
    RETURNING id INTO v_id;
  END IF;
  INSERT INTO public.audit_log (actor_id,actor_email,action,entity_type,entity_id,after_data)
  VALUES (auth.uid(),(SELECT email FROM auth.users WHERE id=auth.uid()),'upsert_story','prophet_story',v_id::text,_payload);
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_prophet_story(_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM public.prophet_stories WHERE id=_id;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.admin_upsert_lesson(_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _payload ? 'id' AND (_payload->>'id') <> '' THEN
    UPDATE public.lessons SET
      slug=COALESCE(_payload->>'slug',slug),
      title=COALESCE(_payload->>'title',title),
      description=COALESCE(_payload->>'description',description),
      cover_image=COALESCE(_payload->>'cover_image',cover_image),
      source_type=COALESCE(_payload->>'source_type',source_type),
      youtube_url=COALESCE(_payload->>'youtube_url',youtube_url),
      video_url=COALESCE(_payload->>'video_url',video_url),
      thumbnail=COALESCE(_payload->>'thumbnail',thumbnail),
      category=COALESCE(_payload->>'category',category),
      series=COALESCE(_payload->>'series',series),
      instructor=COALESCE(_payload->>'instructor',instructor),
      duration_seconds=COALESCE((_payload->>'duration_seconds')::int,duration_seconds),
      status=COALESCE(_payload->>'status',status),
      is_featured=COALESCE((_payload->>'is_featured')::bool,is_featured),
      order_index=COALESCE((_payload->>'order_index')::int,order_index),
      updated_at=now()
    WHERE id=(_payload->>'id')::uuid RETURNING id INTO v_id;
  ELSE
    INSERT INTO public.lessons (slug,title,description,cover_image,source_type,youtube_url,video_url,thumbnail,category,series,instructor,duration_seconds,status,is_featured,order_index)
    VALUES (_payload->>'slug',_payload->>'title',_payload->>'description',_payload->>'cover_image',
      COALESCE(_payload->>'source_type','youtube'),_payload->>'youtube_url',_payload->>'video_url',
      _payload->>'thumbnail',_payload->>'category',_payload->>'series',_payload->>'instructor',
      NULLIF(_payload->>'duration_seconds','')::int,
      COALESCE(_payload->>'status','draft'),
      COALESCE((_payload->>'is_featured')::bool,false),
      COALESCE((_payload->>'order_index')::int,0))
    RETURNING id INTO v_id;
  END IF;
  INSERT INTO public.audit_log (actor_id,actor_email,action,entity_type,entity_id,after_data)
  VALUES (auth.uid(),(SELECT email FROM auth.users WHERE id=auth.uid()),'upsert_lesson','lesson',v_id::text,_payload);
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_lesson(_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM public.lessons WHERE id=_id;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.admin_upsert_prophet_story(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_prophet_story(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_prophet_story(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_prophet_story(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_upsert_lesson(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_lesson(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_lesson(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_lesson(uuid) TO authenticated;