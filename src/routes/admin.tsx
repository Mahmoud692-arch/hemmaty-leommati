import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import OrnamentalDivider from "@/components/OrnamentalDivider";
import { Shield, CheckCircle2, Trash2, Users, BookOpen, MessageCircleQuestion } from "lucide-react";

interface AdminQuestion {
  id: string;
  question: string;
  answer: string | null;
  is_anonymous: boolean;
  is_published: boolean;
  created_at: string;
  user_id: string;
}

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "لوحة الإدارة — هِمَّتي لِأمّتي" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [stats, setStats] = useState({ users: 0, questions: 0, articles: 0 });
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      toast.error("غير مصرّح بالدخول");
      navigate({ to: "/" });
    }
  }, [user, isAdmin, loading, navigate]);

  const refresh = async () => {
    const [{ data: qs }, { count: usersCount }, { count: qCount }, { count: arCount }] =
      await Promise.all([
        supabase.from("user_questions").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("user_questions").select("*", { count: "exact", head: true }),
        supabase.from("article_reads").select("*", { count: "exact", head: true }),
      ]);
    setQuestions((qs as AdminQuestion[]) ?? []);
    setStats({ users: usersCount ?? 0, questions: qCount ?? 0, articles: arCount ?? 0 });
  };

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin]);

  const publish = async (q: AdminQuestion) => {
    const ans = answers[q.id] ?? q.answer ?? "";
    if (!ans.trim()) {
      toast.error("اكتب الإجابة أولًا");
      return;
    }
    const { error } = await supabase
      .from("user_questions")
      .update({
        answer: ans,
        is_published: true,
        answered_at: new Date().toISOString(),
      })
      .eq("id", q.id);
    if (error) {
      toast.error("تعذّر النشر");
      return;
    }
    toast.success("تم نشر الإجابة");
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا السؤال؟")) return;
    const { error } = await supabase.from("user_questions").delete().eq("id", id);
    if (error) {
      toast.error("تعذّر الحذف");
      return;
    }
    toast.success("تم الحذف");
    refresh();
  };

  if (loading || !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
        جاري التحقق...
      </div>
    );
  }

  const pending = questions.filter((q) => !q.is_published);
  const published = questions.filter((q) => q.is_published);

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="text-center mb-8">
        <Shield className="h-12 w-12 mx-auto text-[var(--gold)] mb-3" />
        <h1 className="font-display text-4xl">لوحة الإدارة</h1>
        <OrnamentalDivider />
      </div>

      <section className="grid sm:grid-cols-3 gap-4 mb-10">
        <StatCard icon={Users} label="المستخدمون" value={stats.users} />
        <StatCard icon={MessageCircleQuestion} label="الأسئلة" value={stats.questions} />
        <StatCard icon={BookOpen} label="قراءات المقالات" value={stats.articles} />
      </section>

      <h2 className="font-display text-2xl mb-4">الأسئلة بانتظار المراجعة ({pending.length})</h2>
      {pending.length === 0 ? (
        <p className="text-muted-foreground mb-10">لا توجد أسئلة معلّقة.</p>
      ) : (
        <div className="space-y-4 mb-10">
          {pending.map((q) => (
            <div key={q.id} className="card-elegant rounded-2xl p-5">
              <p className="font-semibold mb-3">{q.question}</p>
              <Textarea
                placeholder="اكتب الإجابة..."
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                rows={4}
              />
              <div className="flex items-center gap-2 mt-3">
                <Button size="sm" onClick={() => publish(q)}>
                  <CheckCircle2 className="h-4 w-4 ml-1" /> أجِب وانشر
                </Button>
                <Button size="sm" variant="destructive" onClick={() => remove(q.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="font-display text-2xl mb-4">المنشورة ({published.length})</h2>
      <div className="space-y-3">
        {published.map((q) => (
          <div key={q.id} className="card-elegant rounded-2xl p-4">
            <p className="font-semibold text-sm">{q.question}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{q.answer}</p>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => remove(q.id)}>
              <Trash2 className="h-3 w-3 ml-1" /> حذف
            </Button>
          </div>
        ))}
      </div>

      <div className="text-center mt-10">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Shield;
  label: string;
  value: number;
}) {
  return (
    <div className="card-elegant rounded-2xl p-5 text-center">
      <Icon className="h-7 w-7 mx-auto text-[var(--gold)] mb-2" />
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
