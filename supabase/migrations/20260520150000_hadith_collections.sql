-- 1) تحديث جدول الأحاديث
ALTER TABLE public.hadiths ADD COLUMN IF NOT EXISTS collection TEXT DEFAULT 'nawawi';

-- حذف قيد الفردية القديم للرقم
ALTER TABLE public.hadiths DROP CONSTRAINT IF EXISTS hadiths_number_key;

-- إضافة قيد الفردية المركب للمجموعة ورقم الحديث
ALTER TABLE public.hadiths ADD CONSTRAINT hadiths_collection_number_key UNIQUE (collection, number);


-- 2) تحديث جدول مفضلة الأحاديث لمنع تداخل أرقام المجموعات المختلفة
ALTER TABLE public.hadith_favorites ADD COLUMN IF NOT EXISTS hadith_collection TEXT DEFAULT 'nawawi';

-- حذف القيد القديم
ALTER TABLE public.hadith_favorites DROP CONSTRAINT IF EXISTS hadith_favorites_user_id_hadith_number_key;

-- إضافة القيد الجديد المركب
ALTER TABLE public.hadith_favorites ADD CONSTRAINT hadith_favorites_user_collection_number_key UNIQUE (user_id, hadith_collection, hadith_number);


-- 3) تحديث جدول قراءات الأحاديث لمنع التداخل
ALTER TABLE public.hadith_reads ADD COLUMN IF NOT EXISTS hadith_collection TEXT DEFAULT 'nawawi';

-- حذف القيد القديم
ALTER TABLE public.hadith_reads DROP CONSTRAINT IF EXISTS hadith_reads_user_id_hadith_number_key;

-- إضافة القيد الجديد المركب
ALTER TABLE public.hadith_reads ADD CONSTRAINT hadith_reads_user_collection_number_key UNIQUE (user_id, hadith_collection, hadith_number);
