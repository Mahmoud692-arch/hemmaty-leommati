import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Clock, Trophy, PlayCircle, CheckCircle2, Lock } from "lucide-react";

interface QuizRow {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  starts_at: string | null;
  ends_at: string | null;
  attempt_policy: string;
}

interface AttemptRow {
  id: string;
  quiz_id: string;
  status: string;
  score: number | null;
  max_score: number | null;
}

export const Route = createFileRoute("/quizzes")({
  head: () => ({
    meta: [
      { title: "الاختبارات | همّتي لأمّتي" },
      { name: "description", content: "اختبارات تفاعلية لتثبيت العلم وتقييم التحصيل" },
    ],
  }),
  component: QuizzesListPage,
});

function QuizzesListPage() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [attempts, setAttempts] = useState<Record<string, AttemptRow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: qs } = await supabase
        .from("quizzes")
        .select("id,title,description,duration_minutes,starts_at,ends_at,attempt_policy")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setQuizzes((qs ?? []) as QuizRow[]);

      if (user) {
        const { data: at } = await supabase
          .from("quiz_attempts")
          .select("id,quiz_id,status,score,max_score")
          .eq("user_id", user.id);
        const map: Record<string, AttemptRow> = {};
        (at ?? []).forEach((a) => {
          map[a.quiz_id] = a as AttemptRow;
        });
        setAttempts(map);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const now = Date.now();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-10">
          <Trophy className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="font-display text-3xl gold-text mb-2">الاختبارات</h1>
          <p className="text-muted-foreground">اختبر معلوماتك وثبّتها</p>
        </div>

        {!user && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center mb-8">
            <Lock className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="mb-3">يجب تسجيل الدخول لخوض الاختبارات</p>
            <Link to="/auth">
              <Button>تسجيل الدخول / حساب جديد</Button>
            </Link>
          </div>
        )}

        {loading ? (
          <div className="text-center text-muted-foreground py-10">جارٍ التحميل…</div>
        ) : quizzes.length === 0 ? (
          <div className="text-center text-muted-foreground py-16 rounded-2xl border border-dashed">
            لا توجد اختبارات متاحة حاليًا
          </div>
        ) : (
          <div className="grid gap-4">
            {quizzes.map((q) => {
              const att = attempts[q.id];
              const notStarted = q.starts_at && new Date(q.starts_at).getTime() > now;
              const ended = q.ends_at && new Date(q.ends_at).getTime() < now;
              const completed = att && att.status !== "in_progress";
              const inProgress = att && att.status === "in_progress";

              return (
                <div
                  key={q.id}
                  className="rounded-2xl border border-border bg-card p-5 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-semibold mb-1">{q.title}</h2>
                      {q.description && (
                        <p className="text-sm text-muted-foreground mb-2">{q.description}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {q.duration_minutes} دقيقة
                        </span>
                        {q.ends_at && (
                          <span>ينتهي: {new Date(q.ends_at).toLocaleDateString("ar-EG")}</span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {!user ? (
                        <Button disabled variant="outline">
                          <Lock className="h-4 w-4 ms-1" /> تسجيل الدخول مطلوب
                        </Button>
                      ) : notStarted ? (
                        <Button disabled variant="outline">لم يبدأ بعد</Button>
                      ) : ended ? (
                        <Button disabled variant="outline">انتهى</Button>
                      ) : completed ? (
                        <div className="text-left">
                          <div className="text-xs text-muted-foreground mb-1">نتيجتك</div>
                          <div className="font-bold text-lg flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            {att.score ?? "—"} / {att.max_score ?? "—"}
                          </div>
                        </div>
                      ) : (
                        <Link to="/quizzes/$id" params={{ id: q.id }}>
                          <Button>
                            <PlayCircle className="h-4 w-4 ms-1" />
                            {inProgress && q.attempt_policy === "resume_allowed" ? "استئناف" : "ابدأ"}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Outlet />
    </Layout>
  );
}
