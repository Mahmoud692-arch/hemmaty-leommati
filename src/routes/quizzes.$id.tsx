import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Clock, AlertTriangle, Send, CheckCircle2, Trophy } from "lucide-react";
import EmailConfirmGate from "@/components/EmailConfirmGate";

interface QuizDetail {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  attempt_policy: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

interface QuestionRow {
  id: string;
  question_text: string;
  question_image: string | null;
  question_type: string;
  options: { text: string; image?: string }[];
  points: number;
  order_index: number;
}

interface AttemptRow {
  id: string;
  status: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  max_score: number | null;
}

interface AnswerRow {
  question_id: string;
  selected_index: number | null;
  essay_text: string | null;
  is_correct: boolean | null;
  awarded_points: number | null;
}

export const Route = createFileRoute("/quizzes/$id")({
  component: QuizRunPage,
});

function QuizRunPage() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [attempt, setAttempt] = useState<AttemptRow | null>(null);
  const [answers, setAnswers] = useState<Record<string, { selected_index?: number; essay_text?: string }>>({});
  const [resultAnswers, setResultAnswers] = useState<AnswerRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const submittedRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    (async () => {
      const { data: q } = await supabase.from("quizzes").select("*").eq("id", id).maybeSingle();
      if (!q || !q.is_active) {
        toast.error("الاختبار غير متاح");
        navigate({ to: "/quizzes" });
        return;
      }
      setQuiz(q as QuizDetail);

      // قراءة آمنة عبر view لا تعرض correct_index للمستخدمين
      const { data: qs } = await (supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (k: string, v: string) => {
              order: (c: string) => Promise<{ data: unknown[] | null }>;
            };
          };
        };
      })
        .from("quiz_questions_safe")
        .select("id,question_text,question_image,question_type,options,points,order_index")
        .eq("quiz_id", id)
        .order("order_index");
      setQuestions((qs ?? []) as unknown as QuestionRow[]);

      // Use limit(1) instead of maybeSingle to avoid PostgREST 406 if duplicates exist
      const { data: existingRows } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("quiz_id", id)
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(1);
      const existing = existingRows?.[0];

      if (existing) {
        setAttempt(existing as AttemptRow);
        if (existing.status !== "in_progress") {
          const { data: ans } = await supabase
            .from("quiz_answers")
            .select("question_id,selected_index,essay_text,is_correct,awarded_points")
            .eq("attempt_id", existing.id);
          setResultAnswers((ans ?? []) as AnswerRow[]);
        } else if (q.attempt_policy === "strict_single") {
          const elapsed = (Date.now() - new Date(existing.started_at).getTime()) / 1000;
          if (elapsed > q.duration_minutes * 60) {
            await supabase.rpc("submit_quiz_attempt", { _attempt_id: existing.id });
            const { data: refreshed } = await supabase
              .from("quiz_attempts")
              .select("*")
              .eq("id", existing.id)
              .maybeSingle();
            if (refreshed) setAttempt(refreshed as AttemptRow);
          }
        } else {
          const { data: ans } = await supabase
            .from("quiz_answers")
            .select("question_id,selected_index,essay_text")
            .eq("attempt_id", existing.id);
          const m: Record<string, { selected_index?: number; essay_text?: string }> = {};
          (ans ?? []).forEach((a) => {
            m[a.question_id] = {
              selected_index: a.selected_index ?? undefined,
              essay_text: a.essay_text ?? undefined,
            };
          });
          setAnswers(m);
        }
      }
      setLoading(false);
    })();
  }, [id, user?.id, authLoading]);

  const startAttempt = async () => {
    if (!user || !quiz) return;
    const { data, error } = await supabase
      .from("quiz_attempts")
      .insert({ quiz_id: quiz.id, user_id: user.id })
      .select()
      .single();
    if (error) {
      // RLS rejects unconfirmed emails — surface a clear message
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("row-level security") || msg.includes("violates")) {
        toast.error("تأكّد من بريدك الإلكتروني أولًا قبل بدء الاختبار");
      } else if (msg.includes("duplicate")) {
        toast.error("لديك محاولة سابقة لهذا الاختبار");
      } else {
        toast.error("تعذّر بدء الاختبار");
      }
      return;
    }
    setAttempt(data as AttemptRow);
  };

  const remainingSec = useMemo(() => {
    if (!attempt || !quiz || attempt.status !== "in_progress") return 0;
    const elapsed = (now - new Date(attempt.started_at).getTime()) / 1000;
    return Math.max(0, quiz.duration_minutes * 60 - elapsed);
  }, [attempt, quiz, now]);

  const submit = async () => {
    if (!attempt || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const rows = questions
        .filter((q) => answers[q.id] !== undefined)
        .map((q) => ({
          attempt_id: attempt.id,
          question_id: q.id,
          selected_index: answers[q.id]?.selected_index ?? null,
          essay_text: answers[q.id]?.essay_text ?? null,
        }));
      await supabase.from("quiz_answers").delete().eq("attempt_id", attempt.id);
      if (rows.length) {
        const { error: insErr } = await supabase.from("quiz_answers").insert(rows);
        if (insErr) throw insErr;
      }

      const { error } = await supabase.rpc("submit_quiz_attempt", { _attempt_id: attempt.id });
      if (error) throw error;

      const { data: refreshed } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("id", attempt.id)
        .maybeSingle();
      if (refreshed) setAttempt(refreshed as AttemptRow);
      const { data: ans } = await supabase
        .from("quiz_answers")
        .select("question_id,selected_index,essay_text,is_correct,awarded_points")
        .eq("attempt_id", attempt.id);
      setResultAnswers((ans ?? []) as AnswerRow[]);
      toast.success("تم تسليم الاختبار");
    } catch (e) {
      toast.error("تعذّر التسليم");
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (attempt?.status === "in_progress" && quiz && remainingSec === 0) {
      submit();
    }
  }, [remainingSec, attempt?.status]);

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">جارٍ التحميل…</div>
      </Layout>
    );
  }
  if (!quiz) return null;

  if (attempt && attempt.status !== "in_progress") {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-10 max-w-3xl">
          <div className="rounded-2xl border bg-card p-6 text-center mb-6">
            <Trophy className="h-12 w-12 text-primary mx-auto mb-2" />
            <h1 className="font-display text-2xl gold-text mb-1">{quiz.title}</h1>
            <p className="text-sm text-muted-foreground mb-4">نتيجتك النهائية</p>
            <div className="text-5xl font-bold text-primary mb-2">
              {attempt.score ?? 0} / {attempt.max_score ?? 0}
            </div>
            {attempt.score !== null && attempt.max_score ? (
              <div className="text-muted-foreground">
                {Math.round((Number(attempt.score) / Number(attempt.max_score)) * 100)}%
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => {
              const a = resultAnswers.find((x) => x.question_id === q.id);
              const correct = a?.is_correct === true;
              return (
                <div key={q.id} className="rounded-xl border p-4 bg-card">
                  <div className="text-xs text-muted-foreground mb-1">سؤال {idx + 1}</div>
                  <div className="font-medium mb-2">{q.question_text}</div>
                  {q.question_image && (
                    <img src={q.question_image} alt="" className="rounded-lg mb-3 max-h-64" />
                  )}
                  {q.question_type === "mcq" ? (
                    <div className="space-y-1">
                      {q.options.map((opt, i) => (
                        <div
                          key={i}
                          className={`px-3 py-2 rounded-lg text-sm border ${
                            a?.selected_index === i
                              ? correct
                                ? "border-emerald-500 bg-emerald-500/10"
                                : "border-destructive bg-destructive/10"
                              : "border-border"
                          }`}
                        >
                          {opt.text}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">
                      {a?.essay_text || <span className="text-muted-foreground">لم تجب</span>}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                    {a?.awarded_points != null ? `النقاط: ${a.awarded_points} / ${q.points}` : "بانتظار التصحيح"}
                    {correct && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 text-center">
            <Link to="/quizzes">
              <Button variant="outline">العودة للاختبارات</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (!attempt) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <EmailConfirmGate feature="بدء الاختبار" className="mb-6" />
          <div className="rounded-2xl border bg-card p-8 text-center">
            <h1 className="font-display text-2xl gold-text mb-2">{quiz.title}</h1>
            {quiz.description && <p className="text-muted-foreground mb-4">{quiz.description}</p>}
            <div className="flex justify-center gap-6 text-sm mb-6">
              <div className="flex items-center gap-1"><Clock className="h-4 w-4" /> {quiz.duration_minutes} دقيقة</div>
              <div>{questions.length} سؤال</div>
            </div>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-sm text-amber-900 dark:text-amber-200 mb-6 flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="text-right">
                {quiz.attempt_policy === "strict_single"
                  ? "تنبيه: محاولة واحدة فقط. بمجرد الضغط ابدأ، لا يمكن العودة حتى لو أُغلق المتصفح."
                  : "يمكنك استئناف الاختبار إن انقطع الاتصال، لكن الوقت يستمر بالعد."}
              </div>
            </div>
            <Button size="lg" onClick={startAttempt}>ابدأ الاختبار الآن</Button>
          </div>
        </div>
      </Layout>
    );
  }

  const mins = Math.floor(remainingSec / 60);
  const secs = Math.floor(remainingSec % 60);
  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur border rounded-xl p-3 mb-6 flex items-center justify-between shadow">
          <div>
            <div className="font-semibold text-sm">{quiz.title}</div>
            <div className="text-xs text-muted-foreground">{questions.length} سؤال</div>
          </div>
          <div
            className={`flex items-center gap-2 font-mono text-lg font-bold ${
              remainingSec < 60 ? "text-destructive animate-pulse" : ""
            }`}
          >
            <Clock className="h-5 w-5" />
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
        </div>

        <div className="space-y-5">
          {questions.map((q, idx) => (
            <div key={q.id} className="rounded-xl border bg-card p-5">
              <div className="text-xs text-muted-foreground mb-1">سؤال {idx + 1} • {q.points} نقطة</div>
              <div className="font-medium mb-3">{q.question_text}</div>
              {q.question_image && (
                <img src={q.question_image} alt="" className="rounded-lg mb-3 max-h-64" />
              )}
              {q.question_type === "mcq" ? (
                <div className="space-y-2">
                  {q.options.map((opt, i) => {
                    const checked = answers[q.id]?.selected_index === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          setAnswers((p) => ({ ...p, [q.id]: { ...p[q.id], selected_index: i } }))
                        }
                        className={`w-full text-right px-3 py-2.5 rounded-lg border transition-colors ${
                          checked
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-accent/40"
                        }`}
                      >
                        {opt.text}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Textarea
                  placeholder="اكتب إجابتك…"
                  rows={4}
                  value={answers[q.id]?.essay_text ?? ""}
                  onChange={(e) =>
                    setAnswers((p) => ({ ...p, [q.id]: { ...p[q.id], essay_text: e.target.value } }))
                  }
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button size="lg" onClick={submit} disabled={submitting}>
            <Send className="h-4 w-4 ml-2" />
            {submitting ? "جارٍ التسليم…" : "تسليم الاختبار"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
