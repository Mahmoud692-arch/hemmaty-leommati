import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ListChecks, Trophy, Eye } from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  attempt_policy: string;
  created_at: string;
}

interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  question_image: string | null;
  question_type: string;
  options: { text: string }[];
  correct_index: number | null;
  points: number;
  order_index: number;
}

interface AttemptWithProfile {
  id: string;
  user_id: string;
  status: string;
  score: number | null;
  max_score: number | null;
  time_spent_seconds: number | null;
  submitted_at: string | null;
  needs_manual_grading: boolean;
  profile: { full_name: string; email: string } | null;
}

const emptyQuiz = (): Partial<Quiz> => ({
  title: "",
  description: "",
  duration_minutes: 10,
  is_active: false,
  attempt_policy: "strict_single",
  starts_at: null,
  ends_at: null,
});

export default function QuizzesManager() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Quiz> | null>(null);
  const [questionsFor, setQuestionsFor] = useState<Quiz | null>(null);
  const [attemptsFor, setAttemptsFor] = useState<Quiz | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("quizzes").select("*").order("created_at", { ascending: false });
    setQuizzes((data ?? []) as Quiz[]);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!editing?.title) {
      toast.error("العنوان مطلوب");
      return;
    }
    const payload = {
      title: editing.title,
      description: editing.description ?? null,
      duration_minutes: editing.duration_minutes ?? 10,
      starts_at: editing.starts_at || null,
      ends_at: editing.ends_at || null,
      is_active: editing.is_active ?? false,
      attempt_policy: editing.attempt_policy ?? "strict_single",
    };
    const { error } = editing.id
      ? await supabase.from("quizzes").update(payload).eq("id", editing.id)
      : await supabase.from("quizzes").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم الحفظ");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف الاختبار وكل أسئلته ومحاولاته؟")) return;
    const { error } = await supabase.from("quizzes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl">الاختبارات</h2>
        <Button onClick={() => setEditing(emptyQuiz())}>
          <Plus className="h-4 w-4 ml-1" /> اختبار جديد
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">جارٍ التحميل…</div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground rounded-xl border border-dashed">
          لا اختبارات بعد
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map((q) => (
            <div key={q.id} className="card-elegant rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{q.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${q.is_active ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                    {q.is_active ? "مفعّل" : "معطّل"}
                  </span>
                  <span className="text-xs text-muted-foreground">{q.duration_minutes} د</span>
                </div>
                {q.description && <p className="text-xs text-muted-foreground line-clamp-1">{q.description}</p>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setQuestionsFor(q)}>
                  <ListChecks className="h-3 w-3 ml-1" /> أسئلة
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAttemptsFor(q)}>
                  <Trophy className="h-3 w-3 ml-1" /> النتائج
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(q)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(q.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "تعديل اختبار" : "اختبار جديد"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>العنوان</Label>
                <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <Label>الوصف</Label>
                <Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>المدة (دقيقة)</Label>
                  <Input type="number" min={1} value={editing.duration_minutes ?? 10} onChange={(e) => setEditing({ ...editing, duration_minutes: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>سياسة المحاولات</Label>
                  <select
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    value={editing.attempt_policy ?? "strict_single"}
                    onChange={(e) => setEditing({ ...editing, attempt_policy: e.target.value })}
                  >
                    <option value="strict_single">واحدة صارمة</option>
                    <option value="resume_allowed">استئناف مسموح</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>يبدأ</Label>
                  <Input type="datetime-local" value={editing.starts_at ? editing.starts_at.slice(0, 16) : ""} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value || null })} />
                </div>
                <div>
                  <Label>ينتهي</Label>
                  <Input type="datetime-local" value={editing.ends_at ? editing.ends_at.slice(0, 16) : ""} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value || null })} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label>تفعيل الاختبار</Label>
                <Switch checked={editing.is_active ?? false} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>إلغاء</Button>
            <Button onClick={save}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* questions manager */}
      <Dialog open={!!questionsFor} onOpenChange={(o) => !o && setQuestionsFor(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>أسئلة: {questionsFor?.title}</DialogTitle>
          </DialogHeader>
          {questionsFor && <QuestionsEditor quizId={questionsFor.id} />}
        </DialogContent>
      </Dialog>

      {/* attempts viewer */}
      <Dialog open={!!attemptsFor} onOpenChange={(o) => !o && setAttemptsFor(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>نتائج: {attemptsFor?.title}</DialogTitle>
          </DialogHeader>
          {attemptsFor && <AttemptsViewer quizId={attemptsFor.id} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuestionsEditor({ quizId }: { quizId: string }) {
  const [items, setItems] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", quizId)
      .order("order_index");
    setItems(((data ?? []) as unknown) as Question[]);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, [quizId]);

  const addNew = async () => {
    const order = items.length;
    const { data, error } = await supabase
      .from("quiz_questions")
      .insert({
        quiz_id: quizId,
        question_text: "سؤال جديد",
        question_type: "mcq",
        options: [{ text: "خيار 1" }, { text: "خيار 2" }],
        correct_index: 0,
        points: 1,
        order_index: order,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setItems((p) => [...p, data as unknown as Question]);
  };

  const update = async (q: Question) => {
    const { error } = await supabase.from("quiz_questions").update({
      question_text: q.question_text,
      question_image: q.question_image,
      question_type: q.question_type,
      options: q.options,
      correct_index: q.correct_index,
      points: q.points,
      order_index: q.order_index,
    }).eq("id", q.id);
    if (error) return toast.error(error.message);
    toast.success("حُفظ");
  };

  const remove = async (id: string) => {
    if (!confirm("حذف السؤال؟")) return;
    await supabase.from("quiz_questions").delete().eq("id", id);
    load();
  };

  if (loading) return <div className="text-center py-6 text-muted-foreground">جارٍ التحميل…</div>;

  return (
    <div className="space-y-4">
      {items.map((q, idx) => (
        <div key={q.id} className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">سؤال {idx + 1}</span>
            <Button size="sm" variant="ghost" onClick={() => remove(q.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <Textarea
            value={q.question_text}
            onChange={(e) => setItems((p) => p.map((x) => (x.id === q.id ? { ...x, question_text: e.target.value } : x)))}
            rows={2}
            placeholder="نص السؤال"
          />
          <Input
            placeholder="رابط صورة (اختياري)"
            value={q.question_image ?? ""}
            onChange={(e) => setItems((p) => p.map((x) => (x.id === q.id ? { ...x, question_image: e.target.value || null } : x)))}
          />
          <div className="flex gap-2 items-center">
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={q.question_type}
              onChange={(e) => setItems((p) => p.map((x) => (x.id === q.id ? { ...x, question_type: e.target.value } : x)))}
            >
              <option value="mcq">اختيار من متعدد</option>
              <option value="essay">مقالي</option>
            </select>
            <Input
              type="number"
              min={1}
              className="w-20"
              value={q.points}
              onChange={(e) => setItems((p) => p.map((x) => (x.id === q.id ? { ...x, points: Number(e.target.value) } : x)))}
            />
            <span className="text-xs text-muted-foreground">نقطة</span>
          </div>
          {q.question_type === "mcq" && (
            <div className="space-y-2">
              {q.options.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="radio"
                    name={`correct-${q.id}`}
                    checked={q.correct_index === i}
                    onChange={() => setItems((p) => p.map((x) => (x.id === q.id ? { ...x, correct_index: i } : x)))}
                  />
                  <Input
                    value={opt.text}
                    onChange={(e) => {
                      const opts = [...q.options];
                      opts[i] = { ...opts[i], text: e.target.value };
                      setItems((p) => p.map((x) => (x.id === q.id ? { ...x, options: opts } : x)));
                    }}
                  />
                  <Button size="sm" variant="ghost" onClick={() => {
                    const opts = q.options.filter((_, j) => j !== i);
                    setItems((p) => p.map((x) => (x.id === q.id ? { ...x, options: opts, correct_index: x.correct_index === i ? 0 : x.correct_index } : x)));
                  }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => {
                setItems((p) => p.map((x) => (x.id === q.id ? { ...x, options: [...x.options, { text: "خيار جديد" }] } : x)));
              }}>
                <Plus className="h-3 w-3 ml-1" /> خيار
              </Button>
            </div>
          )}
          <Button size="sm" onClick={() => update(q)}>حفظ السؤال</Button>
        </div>
      ))}
      <Button onClick={addNew}>
        <Plus className="h-4 w-4 ml-1" /> إضافة سؤال
      </Button>
    </div>
  );
}

function AttemptsViewer({ quizId }: { quizId: string }) {
  const [items, setItems] = useState<AttemptWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("quiz_id", quizId)
      .order("score", { ascending: false, nullsFirst: false });
    const userIds = Array.from(new Set((attempts ?? []).map((a) => a.user_id)));
    const { data: profs } = userIds.length
      ? await supabase.from("profiles").select("user_id,full_name,email").in("user_id", userIds)
      : { data: [] as { user_id: string; full_name: string; email: string }[] };
    const profMap = new Map((profs ?? []).map((p) => [p.user_id, p]));
    const merged = (attempts ?? []).map((a) => ({
      ...a,
      profile: profMap.get(a.user_id) ?? null,
    })) as AttemptWithProfile[];
    // sort by score desc, then time asc
    merged.sort((a, b) => {
      const sa = Number(a.score ?? -1);
      const sb = Number(b.score ?? -1);
      if (sb !== sa) return sb - sa;
      return (a.time_spent_seconds ?? 999999) - (b.time_spent_seconds ?? 999999);
    });
    setItems(merged);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, [quizId]);

  const allowRetry = async (a: AttemptWithProfile) => {
    if (!confirm("حذف هذه المحاولة لإتاحة محاولة جديدة للمستخدم؟")) return;
    await supabase.from("quiz_attempts").delete().eq("id", a.id);
    load();
  };

  if (loading) return <div className="text-center py-6 text-muted-foreground">جارٍ التحميل…</div>;
  if (items.length === 0) return <div className="text-center py-6 text-muted-foreground">لا محاولات بعد</div>;

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground mb-2">مرتبة حسب الدرجة (الأعلى) ثم الوقت (الأسرع)</div>
      {items.map((a, idx) => (
        <div key={a.id} className="rounded-xl border p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
            {idx + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{a.profile?.full_name ?? "—"}</div>
            <div className="text-xs text-muted-foreground">{a.profile?.email ?? ""}</div>
          </div>
          <div className="text-left">
            <div className="font-bold">{a.score ?? "—"} / {a.max_score ?? "—"}</div>
            <div className="text-xs text-muted-foreground">
              {a.time_spent_seconds != null ? `${Math.floor(a.time_spent_seconds / 60)}د ${a.time_spent_seconds % 60}ث` : a.status}
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => allowRetry(a)}>
            <Trash2 className="h-3 w-3 ml-1" /> سماح بمحاولة
          </Button>
        </div>
      ))}
    </div>
  );
}
