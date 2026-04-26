-- ترقية كل المدراء الحاليين إلى super_admin
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT user_id, 'super_admin'::public.app_role
FROM public.user_roles
WHERE role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;

-- جدول رسائل مساعد الذكاء الاصطناعي
CREATE TABLE IF NOT EXISTS public.ai_assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_assistant_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "الأدمن يرى رسائله" ON public.ai_assistant_messages;
CREATE POLICY "الأدمن يرى رسائله"
ON public.ai_assistant_messages FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "الأدمن يضيف رسائل" ON public.ai_assistant_messages;
CREATE POLICY "الأدمن يضيف رسائل"
ON public.ai_assistant_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "الأدمن يحذف رسائله" ON public.ai_assistant_messages;
CREATE POLICY "الأدمن يحذف رسائله"
ON public.ai_assistant_messages FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_ai_assistant_messages_user_created
  ON public.ai_assistant_messages(user_id, created_at DESC);