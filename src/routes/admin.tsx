import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import OrnamentalDivider from "@/components/OrnamentalDivider";
import {
  Shield,
  CheckCircle2,
  Trash2,
  Users,
  BookOpen,
  MessageCircleQuestion,
  Search,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";

interface AdminQuestion {
  id: string;
  question: string;
  answer: string | null;
  is_anonymous: boolean;
  is_published: boolean;
  created_at: string;
  user_id: string;
}

interface ProfileRow {
  user_id: string;
  full_name: string;
  email: string;
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

      <Tabs defaultValue="questions" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="questions">
            <MessageCircleQuestion className="h-4 w-4 ml-1" /> الأسئلة
          </TabsTrigger>
          <TabsTrigger value="roles">
            <ShieldCheck className="h-4 w-4 ml-1" /> الأدوار
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions">
          <h2 className="font-display text-2xl mb-4">
            بانتظار المراجعة ({pending.length})
          </h2>
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
                    onChange={(e) =>
                      setAnswers((p) => ({ ...p, [q.id]: e.target.value }))
                    }
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
        </TabsContent>

        <TabsContent value="roles">
          <RolesManager currentUserId={user!.id} />
        </TabsContent>
      </Tabs>

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

function RolesManager({ currentUserId }: { currentUserId: string }) {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: profs, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
    ]);
    if (pErr || rErr) {
      toast.error("تعذّر تحميل المستخدمين");
      setLoading(false);
      return;
    }
    setProfiles((profs as ProfileRow[]) ?? []);
    setAdminIds(new Set((roles ?? []).map((r) => r.user_id)));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        p.full_name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q)
    );
  }, [profiles, search]);

  const promote = async (uid: string) => {
    setBusyId(uid);
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: "admin" });
    setBusyId(null);
    if (error) {
      toast.error("تعذّرت الترقية");
      return;
    }
    toast.success("تمت الترقية إلى مدير");
    setAdminIds((s) => new Set(s).add(uid));
  };

  const demote = async (uid: string) => {
    if (uid === currentUserId) {
      if (!confirm("سوف تُزيل صلاحية الإدارة عن نفسك. هل أنت متأكد؟")) return;
    }
    setBusyId(uid);
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", uid)
      .eq("role", "admin");
    setBusyId(null);
    if (error) {
      toast.error("تعذّرت الإزالة");
      return;
    }
    toast.success("تمت إزالة صلاحية الإدارة");
    setAdminIds((s) => {
      const n = new Set(s);
      n.delete(uid);
      return n;
    });
  };

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو البريد..."
          className="pr-9"
          maxLength={100}
        />
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">لا توجد نتائج.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const isAdminUser = adminIds.has(p.user_id);
            const isSelf = p.user_id === currentUserId;
            return (
              <div
                key={p.user_id}
                className="card-elegant rounded-2xl p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{p.full_name}</p>
                    {isAdminUser && (
                      <span className="text-[10px] bg-[var(--gold)]/15 text-[var(--gold)] px-2 py-0.5 rounded-full">
                        مدير
                      </span>
                    )}
                    {isSelf && (
                      <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">أنت</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                </div>
                {isAdminUser ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === p.user_id}
                    onClick={() => demote(p.user_id)}
                  >
                    <ShieldOff className="h-4 w-4 ml-1" /> إزالة
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={busyId === p.user_id}
                    onClick={() => promote(p.user_id)}
                  >
                    <ShieldCheck className="h-4 w-4 ml-1" /> ترقية
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
