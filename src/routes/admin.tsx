import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
  FileText,
  ScrollText,
  Plus,
  Pencil,
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

interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  author: string | null;
  category: string | null;
  read_minutes: number;
  is_published: boolean;
}

interface HadithRow {
  id: string;
  number: number;
  arabic_text: string;
  narrator: string | null;
  source: string | null;
  explanation: string | null;
  benefit: string | null;
  category: string | null;
  is_published: boolean;
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

      <Tabs defaultValue="articles" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="articles">
            <FileText className="h-4 w-4 ml-1" /> المقالات
          </TabsTrigger>
          <TabsTrigger value="hadiths">
            <ScrollText className="h-4 w-4 ml-1" /> الأحاديث
          </TabsTrigger>
          <TabsTrigger value="questions">
            <MessageCircleQuestion className="h-4 w-4 ml-1" /> الأسئلة
          </TabsTrigger>
          <TabsTrigger value="roles">
            <ShieldCheck className="h-4 w-4 ml-1" /> الأدوار
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles">
          <ArticlesManager />
        </TabsContent>

        <TabsContent value="hadiths">
          <HadithsManager />
        </TabsContent>

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

/* ============== ARTICLES MANAGER ============== */

const emptyArticle: Omit<ArticleRow, "id"> = {
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  cover_image: "",
  author: "",
  category: "",
  read_minutes: 5,
  is_published: true,
};

function ArticlesManager() {
  const [items, setItems] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ArticleRow | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<ArticleRow, "id">>(emptyArticle);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("تعذّر تحميل المقالات");
    setItems((data as ArticleRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (a) => a.title.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q)
    );
  }, [items, search]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyArticle);
    setOpen(true);
  };

  const openEdit = (a: ArticleRow) => {
    setEditing(a);
    setForm({
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt ?? "",
      content: a.content,
      cover_image: a.cover_image ?? "",
      author: a.author ?? "",
      category: a.category ?? "",
      read_minutes: a.read_minutes,
      is_published: a.is_published,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.slug.trim() || !form.content.trim()) {
      toast.error("العنوان والرابط والمحتوى مطلوبة");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      excerpt: form.excerpt || null,
      cover_image: form.cover_image || null,
      author: form.author || null,
      category: form.category || null,
    };
    const { error } = editing
      ? await supabase.from("articles").update(payload).eq("id", editing.id)
      : await supabase.from("articles").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "الرابط مستخدم" : "تعذّر الحفظ");
      return;
    }
    toast.success(editing ? "تم التحديث" : "تمّت الإضافة");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا المقال؟")) return;
    const { error } = await supabase.from("articles").delete().eq("id", id);
    if (error) {
      toast.error("تعذّر الحذف");
      return;
    }
    toast.success("تم الحذف");
    load();
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في المقالات..."
            className="pr-9"
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 ml-1" /> مقال جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "تعديل المقال" : "مقال جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>العنوان</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>الرابط (slug)</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="example-article"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>التصنيف</Label>
                  <Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
                <div>
                  <Label>الكاتب</Label>
                  <Input value={form.author ?? ""} onChange={(e) => setForm({ ...form, author: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>صورة الغلاف (رابط)</Label>
                  <Input value={form.cover_image ?? ""} onChange={(e) => setForm({ ...form, cover_image: e.target.value })} />
                </div>
                <div>
                  <Label>دقائق القراءة</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.read_minutes}
                    onChange={(e) => setForm({ ...form, read_minutes: Number(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div>
                <Label>المقتطف</Label>
                <Textarea
                  value={form.excerpt ?? ""}
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <Label>المحتوى (Markdown مدعوم)</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_published}
                  onCheckedChange={(v) => setForm({ ...form, is_published: v })}
                />
                <Label>منشور</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          لا مقالات بعد. أضف أوّل مقال من الزرّ أعلاه.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="card-elegant rounded-2xl p-4 flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{a.title}</p>
                  {!a.is_published && (
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">مسودّة</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">/{a.slug}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => openEdit(a)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="destructive" onClick={() => remove(a.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============== HADITHS MANAGER ============== */

const emptyHadith: Omit<HadithRow, "id"> = {
  number: 1,
  arabic_text: "",
  narrator: "",
  source: "",
  explanation: "",
  benefit: "",
  category: "",
  is_published: true,
};

function HadithsManager() {
  const [items, setItems] = useState<HadithRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<HadithRow | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<HadithRow, "id">>(emptyHadith);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("hadiths")
      .select("*")
      .order("number", { ascending: true });
    if (error) toast.error("تعذّر تحميل الأحاديث");
    setItems((data as HadithRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (h) =>
        String(h.number).includes(q) ||
        h.arabic_text.toLowerCase().includes(q) ||
        (h.source ?? "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const openNew = () => {
    const nextNum = items.length ? Math.max(...items.map((h) => h.number)) + 1 : 1;
    setEditing(null);
    setForm({ ...emptyHadith, number: nextNum });
    setOpen(true);
  };

  const openEdit = (h: HadithRow) => {
    setEditing(h);
    setForm({
      number: h.number,
      arabic_text: h.arabic_text,
      narrator: h.narrator ?? "",
      source: h.source ?? "",
      explanation: h.explanation ?? "",
      benefit: h.benefit ?? "",
      category: h.category ?? "",
      is_published: h.is_published,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.arabic_text.trim() || !form.number) {
      toast.error("النصّ ورقم الحديث مطلوبان");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      narrator: form.narrator || null,
      source: form.source || null,
      explanation: form.explanation || null,
      benefit: form.benefit || null,
      category: form.category || null,
    };
    const { error } = editing
      ? await supabase.from("hadiths").update(payload).eq("id", editing.id)
      : await supabase.from("hadiths").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "رقم مستخدم" : "تعذّر الحفظ");
      return;
    }
    toast.success(editing ? "تم التحديث" : "تمّت الإضافة");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا الحديث؟")) return;
    const { error } = await supabase.from("hadiths").delete().eq("id", id);
    if (error) {
      toast.error("تعذّر الحذف");
      return;
    }
    toast.success("تم الحذف");
    load();
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث برقم أو نص..."
            className="pr-9"
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 ml-1" /> حديث جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "تعديل الحديث" : "حديث جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>رقم الحديث</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.number}
                    onChange={(e) => setForm({ ...form, number: Number(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label>التصنيف</Label>
                  <Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>النصّ العربي</Label>
                <Textarea
                  value={form.arabic_text}
                  onChange={(e) => setForm({ ...form, arabic_text: e.target.value })}
                  rows={5}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>الراوي</Label>
                  <Input value={form.narrator ?? ""} onChange={(e) => setForm({ ...form, narrator: e.target.value })} />
                </div>
                <div>
                  <Label>التخريج</Label>
                  <Input
                    value={form.source ?? ""}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    placeholder="رواه البخاري ومسلم"
                  />
                </div>
              </div>
              <div>
                <Label>الشرح</Label>
                <Textarea
                  value={form.explanation ?? ""}
                  onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                  rows={4}
                />
              </div>
              <div>
                <Label>الفائدة العملية</Label>
                <Textarea
                  value={form.benefit ?? ""}
                  onChange={(e) => setForm({ ...form, benefit: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_published}
                  onCheckedChange={(v) => setForm({ ...form, is_published: v })}
                />
                <Label>منشور</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          لا أحاديث في قاعدة البيانات بعد. أضف أوّل حديث من الزرّ أعلاه.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((h) => (
            <div
              key={h.id}
              className="card-elegant rounded-2xl p-4 flex items-center justify-between gap-3"
            >
              <div className="shrink-0 w-9 h-9 rounded-full bg-[var(--gold)]/15 text-[var(--gold)] flex items-center justify-center text-sm font-bold">
                {h.number}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm line-clamp-2">{h.arabic_text}</p>
                <p className="text-xs text-muted-foreground mt-1">{h.source}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => openEdit(h)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="destructive" onClick={() => remove(h.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============== ROLES MANAGER ============== */

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
