-- 1) إضافة حالة وجدولة للمقالات
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- مزامنة status مع is_published للبيانات القديمة
UPDATE public.articles SET status = CASE WHEN is_published THEN 'published' ELSE 'draft' END;

-- قيد للحالات المسموحة
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'articles_status_check') THEN
    ALTER TABLE public.articles
      ADD CONSTRAINT articles_status_check
      CHECK (status IN ('draft','scheduled','published'));
  END IF;
END $$;

-- 2) تحديث سياسة القراءة لتُظهر فقط المنشور (وليس المسوّدة/المجدول) للزوار
DROP POLICY IF EXISTS "المقالات المنشورة مرئية للجميع" ON public.articles;
CREATE POLICY "المقالات المنشورة مرئية للجميع"
ON public.articles FOR SELECT
USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

-- 3) Bucket عام للوسائط
INSERT INTO storage.buckets (id, name, public)
VALUES ('media','media', true)
ON CONFLICT (id) DO NOTHING;

-- سياسات التخزين
DROP POLICY IF EXISTS "الوسائط مرئية للجميع" ON storage.objects;
CREATE POLICY "الوسائط مرئية للجميع"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

DROP POLICY IF EXISTS "الإدارة ترفع وسائط" ON storage.objects;
CREATE POLICY "الإدارة ترفع وسائط"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "الإدارة تحدث وسائط" ON storage.objects;
CREATE POLICY "الإدارة تحدث وسائط"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "الإدارة تحذف وسائط" ON storage.objects;
CREATE POLICY "الإدارة تحذف وسائط"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));

-- 4) دالة ومهمة دورية لنشر المقالات المُجدوَلة
CREATE OR REPLACE FUNCTION public.publish_due_articles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.articles
  SET status = 'published', is_published = true, updated_at = now()
  WHERE status = 'scheduled'
    AND scheduled_at IS NOT NULL
    AND scheduled_at <= now();
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- إلغاء الجدولة السابقة إن وُجدت
DO $$
DECLARE jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'publish-due-articles';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
END $$;

SELECT cron.schedule(
  'publish-due-articles',
  '* * * * *',
  $$ SELECT public.publish_due_articles(); $$
);