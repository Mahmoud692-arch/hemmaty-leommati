
-- 1) Remove overlapping permissive SELECT on quiz_questions that leaked correct_index
DROP POLICY IF EXISTS "أسئلة الكويز النشطة للمسجلين عبر ا" ON public.quiz_questions;
DROP POLICY IF EXISTS "أسئلة الكويز للأدمن فقط مع الأعمدة" ON public.quiz_questions;

CREATE POLICY "quiz_questions: admin only SELECT"
ON public.quiz_questions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2) Explicit public read for media bucket (intentional: cover images, ads, public assets)
DROP POLICY IF EXISTS "Public read media bucket" ON storage.objects;
CREATE POLICY "Public read media bucket"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'media');

-- 3) achievement_rules: let signed-in users read active rules (for badge gallery UI)
CREATE POLICY "Active achievement rules readable by signed-in users"
ON public.achievement_rules FOR SELECT TO authenticated
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
