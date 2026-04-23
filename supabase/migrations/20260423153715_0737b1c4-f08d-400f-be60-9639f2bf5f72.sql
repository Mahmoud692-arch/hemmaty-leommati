
-- =========================================================
-- همتي لأمتي - قاعدة البيانات الكاملة
-- =========================================================

-- 1) Enum للأدوار
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2) جدول الملفات الشخصية (profiles)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  date_of_birth DATE,
  country TEXT,
  avatar_url TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  total_points INTEGER NOT NULL DEFAULT 0,
  articles_read INTEGER NOT NULL DEFAULT 0,
  hadiths_read INTEGER NOT NULL DEFAULT 0,
  quizzes_passed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "الملفات الشخصية مرئية للجميع المسجلين"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "المستخدم يحدّث ملفه فقط"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "المستخدم ينشئ ملفه فقط"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3) جدول الأدوار (منفصل منعاً للترقية الخبيثة)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- دالة has_role (security definer لتجنب الاستدعاء التكراري)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "المستخدم يرى أدواره"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "الإدارة تدير الأدوار"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) دالة وتريغر لإنشاء ملف شخصي تلقائياً عند التسجيل
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, phone, date_of_birth, country)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'مستخدم جديد'),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    (NEW.raw_user_meta_data->>'date_of_birth')::date,
    NEW.raw_user_meta_data->>'country'
  );
  -- دور افتراضي
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5) دالة تحديث updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) قراءات المقالات (تتبع تقدم المستخدم)
CREATE TABLE public.article_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_slug TEXT NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, article_slug)
);

ALTER TABLE public.article_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "المستخدم يرى قراءاته"
  ON public.article_reads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "المستخدم يسجل قراءاته"
  ON public.article_reads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 7) قراءات الأحاديث
CREATE TABLE public.hadith_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hadith_number INTEGER NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, hadith_number)
);

ALTER TABLE public.hadith_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "المستخدم يرى قراءات الأحاديث"
  ON public.hadith_reads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "المستخدم يسجل قراءات الأحاديث"
  ON public.hadith_reads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 8) المفضلة (الأحاديث)
CREATE TABLE public.hadith_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hadith_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, hadith_number)
);

ALTER TABLE public.hadith_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "المستخدم يدير مفضلته"
  ON public.hadith_favorites FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 9) الأسئلة من المستخدمين
CREATE TABLE public.user_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "الأسئلة المنشورة مرئية للجميع المسجلين"
  ON public.user_questions FOR SELECT
  TO authenticated
  USING (is_published = true OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "المستخدم يطرح أسئلة"
  ON public.user_questions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "الإدارة تجيب وتحدث"
  ON public.user_questions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "الإدارة تحذف"
  ON public.user_questions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_user_questions_updated_at
  BEFORE UPDATE ON public.user_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10) الشارات
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_key)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "الشارات مرئية للجميع المسجلين"
  ON public.user_badges FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "النظام يضيف شارات للمستخدم"
  ON public.user_badges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- فهارس للأداء
CREATE INDEX idx_profiles_points ON public.profiles(total_points DESC);
CREATE INDEX idx_article_reads_user ON public.article_reads(user_id);
CREATE INDEX idx_hadith_reads_user ON public.hadith_reads(user_id);
CREATE INDEX idx_questions_published ON public.user_questions(is_published, created_at DESC);
