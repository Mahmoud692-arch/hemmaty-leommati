-- ============================================================
-- إصلاحات الأمان — همتي لأمتي
-- ============================================================

-- ① جدول profiles: المستخدم يرى ملفه فقط، الأدمن يرى الكل
--    (المشكلة: الـ policy القديم كان يكشف email وphone لكل المستخدمين)
DROP POLICY IF EXISTS "الملفات الشخصية مرئية للجميع المسجلين" ON public.profiles;

CREATE POLICY "المستخدم يرى ملفه والأدمن يرى الكل"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
  );

-- ② جدول user_badges: الشارات للـ leaderboard تحتاج تكون مرئية للكل
--    بس INSERT يكون عن طريق الأدمن أو الـ trigger فقط، مش المستخدم مباشرة
DROP POLICY IF EXISTS "النظام يضيف شارات للمستخدم" ON public.user_badges;

CREATE POLICY "الأدمن والتريغر فقط يضيفون الشارات"
  ON public.user_badges FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ③ اسمح للـ leaderboard يشوف الأسماء والنقاط فقط (بدون PII)
--    عن طريق view محمية
CREATE OR REPLACE VIEW public.leaderboard_view AS
  SELECT
    p.user_id,
    p.full_name,
    p.avatar_url,
    p.total_points,
    p.level
  FROM public.profiles p
  ORDER BY p.total_points DESC;

-- منح صلاحية القراءة على الـ view للمستخدمين المسجلين
GRANT SELECT ON public.leaderboard_view TO authenticated;
