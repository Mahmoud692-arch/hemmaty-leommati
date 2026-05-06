## المحور الأول: إغلاق الفجوات الحرجة

### 1) الأمان أولاً (Migration واحدة)
- توحيد سياسات `quiz_questions`: حذف السياسة المتسامحة وإبقاء سياسة الأدمن فقط؛ كشف أسئلة الكويز للمستخدم يكون عبر RPC `start_quiz_attempt` يُرجع الأسئلة بدون `correct_index`.
- إخفاء `conditions`/`reward` التفصيلية في `achievement_rules` عن المستخدم العادي عبر VIEW عام `public_achievements` (id, name, description, is_active فقط).
- تقييد `article_audio` SELECT لـ `authenticated` بدلاً من `public`.
- إضافة Trigger يمنع إدراج صف في `avatar_change_log` إلا من خلال RPC `change_avatar` (SECURITY DEFINER) — توثيقه.

### 2) AvatarChanger في الواجهة
- إدماج `<AvatarChanger />` داخل `/dashboard` و`/me` مع عرض التاريخ المتبقّي للـ60 يومًا.

### 3) المفضّلة (زر القلب)
- مكوّن `<FavoriteButton entityType="article|lesson" entityId="..." />` يُستخدم في `articles.$slug.tsx` و`lessons.$slug.tsx`؛ يكتب في `article_favorites` / `lesson_favorites` ويعرض حالة فورية.

### 4) استئناف القراءة/المشاهدة
- داخل صفحة المقال: عند Mount نسجّل `last_visits` (entity_type='article'); عند Scroll نحدّث `scroll_percent`.
- داخل صفحة الدرس: نُحدّث `lesson_progress.last_position_sec` كل 10 ثوانٍ، ونعتبر `completed=true` عند ≥90%.
- في الهوم بيج (`/`): قسم جديد "تابع من حيث توقّفت" يجلب آخر 3 من `last_visits` للمستخدم المسجّل.

### 5) نقاط الدرس → الرحلة الإيمانية
- Trigger على `lesson_progress` عند `completed=true` لأول مرة:
  - يُضيف 5 نقاط في `points_adjustments`.
  - يستدعي `recompute_journey_level(user_id)` لتحديث المستوى.
  - يُنشئ إشعارًا "أتممتَ درسًا — +5 نقاط".

### 6) إصلاح صفحة الكويزات
- RPC جديدة `start_quiz_attempt(quiz_id)` تُرجع `attempt_id` + `questions` (بدون `correct_index`).
- RPC `submit_quiz_attempt(attempt_id, answers[])` تحسب النتيجة وتمنع تكرار المحاولة وفق `attempt_policy`.
- تحديث `quizzes.$id.tsx` لاستخدام الـ RPCs بدل القراءة المباشرة من `quiz_questions`.

### 7) منظومة الإشعارات التلقائية (Triggers)
- Trigger على `articles` عند `status` يصبح `published`: broadcast لكل المستخدمين النشطين خلال 30 يومًا.
- Trigger على `user_questions` عند `is_published=true`: إشعار لصاحب السؤال + رابط للإجابة.
- Trigger على `user_badges` عند الإدراج: إشعار "حصلتَ على شارة جديدة".
- تبويب جديد "إشعاراتي" داخل `/dashboard` بقائمة كاملة قابلة للتصفية والتعليم كمقروء.

### 8) توسيع AI Admin
أدوات إضافية في `admin-assistant`:
- `upsert_quote` (الاقتباسات الذكية).
- `regenerate_article_audio` (يستدعي `article-tts`).
- `grant_badge` / `revoke_badge` لمستخدم محدد (مع تحقّق صارم: المُستدعي أدمن + المنح فقط للآخرين، لا يمنح نفسه).
- `bulk_import_articles` (مصفوفة JSON دفعة واحدة كمسودّات).

---

## التفاصيل التقنية

**Migration واحدة شاملة:**
```sql
-- quiz_questions: حذف السياسة المتسامحة
DROP POLICY "quiz_questions: admin only SELECT" ON quiz_questions;
-- (تبقى سياسة "الإدارة تدير أسئلة الكويز" ALL admin)
-- إنشاء RPC start_quiz_attempt + submit_quiz_attempt

-- VIEW public_achievements
CREATE VIEW public_achievements AS
  SELECT id, name, description, is_active FROM achievement_rules WHERE is_active;

-- article_audio: تقييد لـ authenticated
DROP POLICY "الصوتيات للجميع" ON article_audio;
CREATE POLICY "الصوتيات للمسجّلين" ON article_audio FOR SELECT TO authenticated USING (true);

-- Triggers: نشر مقال، نشر إجابة، منح شارة، إكمال درس
-- RPC: grant_badge_to_user (admin-only, target != self)
```

**ملفات React الجديدة:**
- `src/components/FavoriteButton.tsx`
- `src/components/ResumeReading.tsx` (في الهوم)
- `src/hooks/useTrackProgress.ts` (للمقال + الدرس)

**ملفات معدّلة:**
- `src/routes/dashboard.tsx` (Avatar + tab إشعارات)
- `src/routes/me.tsx` (Avatar)
- `src/routes/articles.$slug.tsx` (مفضّلة + tracking)
- `src/routes/lessons.$slug.tsx` (مفضّلة + progress)
- `src/routes/quizzes.$id.tsx` (RPC الجديدة)
- `src/routes/index.tsx` (قسم Resume)
- `src/components/admin/AdminAssistant.tsx` (لا يتغيّر — UI ذاتي)
- `supabase/functions/admin-assistant/index.ts` (4 أدوات جديدة)

---

## الترتيب التنفيذي
1. Migration الأمان + Triggers + RPCs (جولة DB).
2. مكوّنات React الجديدة + ربط الواجهات.
3. توسيع AI Admin.
4. اختبار يدوي سريع لكل مسار.

سأنفّذ كل المحاور بالتتابع دون انتظار، وأرد فقط عند الانتهاء.