-- ============================================================
-- حماية ملفات التخزين (Storage Security) لحاوية media
-- ============================================================

-- 1. تمكين RLS على جدول الكائنات في التخزين (إذا لم يكن مفعلاً)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. إزالة أي سياسات سابقة لتجنب التضارب
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin modify/delete" ON storage.objects;

-- 3. السماح للجميع (المسجلين وغير المسجلين) بقراءة وتحميل الملفات من حاوية media
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'media' );

-- 4. السماح للمشرفين (admin) فقط برفع صور وملفات جديدة إلى حاوية media
CREATE POLICY "Allow admin upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media' 
  AND public.has_role(auth.uid(), 'admin')
);

-- 5. السماح للمشرفين (admin) فقط بتعديل أو حذف الملفات في حاوية media
CREATE POLICY "Allow admin modify/delete"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'media' 
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'media' 
  AND public.has_role(auth.uid(), 'admin')
);
