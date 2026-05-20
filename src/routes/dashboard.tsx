import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getLevel, getNextLevel, getLevelProgress, LEVELS } from "@/lib/journey";
import { Progress } from "@/components/ui/progress";
import { Trophy, BookOpen, Scroll, Flame, Star, ArrowLeft } from "lucide-react";
import OrnamentalDivider from "@/components/OrnamentalDivider";
import UserBadges from "@/components/UserBadges";
import AvatarChanger from "@/components/AvatarChanger";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "لوحة الإنجاز — هِمَّتي لِأمّتي" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  // 🔒 حماية الدخول
  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate({ to: "/auth", replace: true });
      return;
    }

    if (!profile) {
      // لو المستخدم موجود لكن البروفايل مش جاهز
      navigate({ to: "/auth", replace: true });
    }
  }, [user, profile, loading, navigate]);

  // 🔒 منع أي عرض قبل التحقق الكامل
  if (loading || !user || !profile) {
    return (
      <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
        جاري التحقق من بيانات الدخول...
      </div>
    );
  }

  const level = getLevel(profile.total_points);
  const nextLv = getNextLevel(profile.total_points);
  const progress = getLevelProgress(profile.total_points);

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl md:text-4xl">
          السلام عليكم، {profile.full_name?.split(" ")[0] ?? "ضيف"} 🌙
        </h1>
        <p className="text-muted-foreground mt-2">
          هذه لوحة إنجازك في رحلتك الإيمانية
        </p>
        <OrnamentalDivider />
      </div>

      <section className="card-elegant rounded-2xl p-5 mb-6">
        <h2 className="font-display text-lg mb-3">صورتي الشخصية</h2>
        <AvatarChanger />
      </section>

      {/* Level card */}
      <section className="card-elegant rounded-3xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute inset-0 arabic-pattern opacity-20" />
        <div className="relative z-10 grid md:grid-cols-3 gap-6 items-center">
          <div className="text-center md:text-right">
            <div className="text-xs text-[var(--gold)] tracking-widest uppercase mb-1">
              المستوى الحالي
            </div>
            <div className="font-display text-3xl md:text-4xl">{level.title}</div>
            <div className="text-sm text-muted-foreground">{level.subtitle}</div>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-semibold">{profile.total_points} نقطة</span>

              {nextLv ? (
                <span className="text-muted-foreground">
                  المستوى التالي: {nextLv.title} ({nextLv.minPoints})
                </span>
              ) : (
                <span className="text-[var(--gold)] font-semibold">
                  أعلى مستوى! 🏆
                </span>
              )}
            </div>

            <Progress value={progress} className="h-3" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 my-8">
        {[
          { icon: BookOpen, label: "مقالات مقروءة", value: profile.articles_read },
          { icon: Scroll, label: "أحاديث مقروءة", value: profile.hadiths_read },
          { icon: Trophy, label: "اختبارات", value: profile.quizzes_passed },
          { icon: Flame, label: "نقاط", value: profile.total_points },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card-elegant rounded-2xl p-5 text-center">
              <Icon className="h-7 w-7 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          );
        })}
      </section>

      {/* Badges */}
      <section className="my-10">
        <h2 className="font-display text-2xl mb-4 flex items-center gap-2">
          <Star className="h-5 w-5 text-[var(--gold)]" /> شاراتك
        </h2>
        <UserBadges />
      </section>

      {/* Levels overview */}
      <section className="my-10">
        <h2 className="font-display text-2xl mb-4">رحلتك بالكامل</h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {LEVELS.map((lv) => {
            const reached = profile.total_points >= lv.minPoints;

            return (
              <div
                key={lv.level}
                className={`card-elegant rounded-2xl p-5 ${
                  reached ? "border-[var(--gold)]/40" : "opacity-60"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      reached
                        ? "bg-[var(--gradient-gold)] text-[var(--gold-foreground)]"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {lv.level}
                  </div>

                  <div>
                    <div className="font-display">{lv.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {lv.minPoints}+ نقطة
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
        <Link to="/articles" className="text-primary hover:underline font-semibold">
          تابع القراءة <ArrowLeft className="h-4 w-4 inline me-1" />
        </Link>
        <Link to="/leaderboard" className="text-primary hover:underline font-semibold">
          لوحة المتصدّرين
        </Link>
        <Link to="/favorites" className="text-primary hover:underline font-semibold">
          مفضّلتي
        </Link>
      </div>
    </div>
  );
}