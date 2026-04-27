
-- إلغاء EXECUTE من anon لكل دوال الإدارة
REVOKE EXECUTE ON FUNCTION public.admin_create_article(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_create_hadith(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_create_quiz_with_questions(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_broadcast_notification(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_article(uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_article(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_hadith(uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_hadith(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_quiz(uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_quiz(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_schedule_content(text, uuid, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_moderate_comment(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_respond_to_question(uuid, text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_user_info(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_article_performance(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_quiz_performance(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_site_setting(text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.publish_due_articles() FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid) FROM anon;

-- منع سرد ملفات الوسائط (المستخدمون يقرؤون عبر الرابط المباشر، الأدمن يسرد)
DROP POLICY IF EXISTS "media files readable by url" ON storage.objects;

CREATE POLICY "media: admins can list and read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'media' 
  AND public.has_role(auth.uid(), 'admin')
);

-- ملاحظة: الملفات لا تزال متاحة للقراءة العامة عبر الـ public URL
-- لأن البكت معرّف public=true (CDN يخدمها مباشرة)، لكن لا أحد يستطيع سرد محتوياته.
