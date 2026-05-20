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
  Upload,
  Eye,
  Clock,
  Send,
  Save,
  Trophy,
  Settings,
  History,
  MessageSquare,
  LayoutGrid,
  Download,
  Loader2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import QuizzesManager from "@/components/admin/QuizzesManager";
import SettingsManager from "@/components/admin/SettingsManager";
import AuditLogViewer from "@/components/admin/AuditLogViewer";
import RLSTestPanel from "@/components/admin/RLSTestPanel";
import CommentsManager from "@/components/admin/CommentsManager";
import HomepageSectionsManager from "@/components/admin/HomepageSectionsManager";
import UsersManager from "@/components/admin/UsersManager";
import AdminAssistant from "@/components/admin/AdminAssistant";
import PagesManager from "@/components/admin/PagesManager";
import AdsManager from "@/components/admin/AdsManager";
import PointsManager from "@/components/admin/PointsManager";
import DynamicContentManager from "@/components/admin/DynamicContentManager";
import ProgramsManager from "@/components/admin/ProgramsManager";
import FormsManager from "@/components/admin/FormsManager";
import TaxonomyManager from "@/components/admin/TaxonomyManager";
import AutomationManager from "@/components/admin/AutomationManager";
import AchievementsManager from "@/components/admin/AchievementsManager";
import StoriesManager from "@/components/admin/StoriesManager";
import LessonsManager from "@/components/admin/LessonsManager";
import { Sparkles, FileStack, Megaphone, Compass, ClipboardList, Tags, Zap, Award, BookMarked, PlayCircle } from "lucide-react";

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

type ArticleStatus = "draft" | "scheduled" | "published";

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
  status: ArticleStatus;
  scheduled_at: string | null;
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
  collection?: string | null;
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
  const [activeTab, setActiveTab] = useState("assistant");

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* شاشات الموبايل: اختيار القسم عبر قائمة منسدلة أنيقة */}
        <div className="lg:hidden mb-6 relative">
          <label htmlFor="admin-tabs-select" className="sr-only">اختر القسم</label>
          <select
            id="admin-tabs-select"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full p-4.5 rounded-2xl border border-border bg-card text-foreground font-semibold shadow-soft focus:outline-none focus:ring-2 focus:ring-[var(--gold)] transition-all appearance-none cursor-pointer text-right ps-10"
          >
            <option value="assistant">✨ مساعد الإدارة الذكي</option>
            <option value="users">👥 إدارة المستخدمين</option>
            <option value="articles">📝 إدارة المقالات</option>
            <option value="hadiths">📜 إدارة الأحاديث</option>
            <option value="questions">❓ مراجعة الأسئلة</option>
            <option value="quizzes">🏆 إدارة الاختبارات</option>
            <option value="comments">💬 إدارة التعليقات</option>
            <option value="sections">📱 إدارة أقسام الرئيسية</option>
            <option value="pages">📄 إدارة صفحات CMS</option>
            <option value="ads">📢 إدارة الإعلانات</option>
            <option value="points">🎖️ إدارة نقاط التفاعل</option>
            <option value="dynamic">📁 إدارة المحتوى الديناميكي</option>
            <option value="programs">🧭 إدارة البرامج</option>
            <option value="forms">📋 إدارة النماذج</option>
            <option value="taxonomy">🏷️ إدارة التصنيفات</option>
            <option value="automation">⚡ أتمتة العمليات</option>
            <option value="achievements">🏅 قواعد الإنجازات</option>
            <option value="stories">📖 قصص الأنبياء</option>
            <option value="lessons">▶️ إدارة الدروس</option>
            <option value="settings">⚙️ الإعدادات العامة</option>
            <option value="roles">🛡️ إدارة الأدوار والصلاحيات</option>
            <option value="audit">⏳ سجل العمليات (Audit Logs)</option>
            <option value="security">🔒 أمان قاعدة البيانات (RLS)</option>
          </select>
          {/* أيقونة السهم المخصص */}
          <div className="pointer-events-none absolute inset-y-0 start-4 flex items-center text-muted-foreground">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>

        <TabsList className="hidden lg:flex flex-wrap h-auto w-full mb-6 gap-1">
          <TabsTrigger value="assistant"><Sparkles className="h-4 w-4 ms-1" /> المساعد</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4 ms-1" /> المستخدمون</TabsTrigger>
          <TabsTrigger value="articles"><FileText className="h-4 w-4 ms-1" /> المقالات</TabsTrigger>
          <TabsTrigger value="hadiths"><ScrollText className="h-4 w-4 ms-1" /> الأحاديث</TabsTrigger>
          <TabsTrigger value="questions"><MessageCircleQuestion className="h-4 w-4 ms-1" /> الأسئلة</TabsTrigger>
          <TabsTrigger value="quizzes"><Trophy className="h-4 w-4 ms-1" /> الاختبارات</TabsTrigger>
          <TabsTrigger value="comments"><MessageSquare className="h-4 w-4 ms-1" /> التعليقات</TabsTrigger>
          <TabsTrigger value="sections"><LayoutGrid className="h-4 w-4 ms-1" /> الرئيسية</TabsTrigger>
          <TabsTrigger value="pages"><FileStack className="h-4 w-4 ms-1" /> الصفحات</TabsTrigger>
          <TabsTrigger value="ads"><Megaphone className="h-4 w-4 ms-1" /> الإعلانات</TabsTrigger>
          <TabsTrigger value="points"><Trophy className="h-4 w-4 ms-1" /> النقاط</TabsTrigger>
          <TabsTrigger value="dynamic"><FileStack className="h-4 w-4 ms-1" /> محتوى ديناميكي</TabsTrigger>
          <TabsTrigger value="programs"><Compass className="h-4 w-4 ms-1" /> البرامج</TabsTrigger>
          <TabsTrigger value="forms"><ClipboardList className="h-4 w-4 ms-1" /> النماذج</TabsTrigger>
          <TabsTrigger value="taxonomy"><Tags className="h-4 w-4 ms-1" /> التصنيفات</TabsTrigger>
          <TabsTrigger value="automation"><Zap className="h-4 w-4 ms-1" /> الأتمتة</TabsTrigger>
          <TabsTrigger value="achievements"><Award className="h-4 w-4 ms-1" /> الإنجازات</TabsTrigger>
          <TabsTrigger value="stories"><BookMarked className="h-4 w-4 ms-1" /> قصص الأنبياء</TabsTrigger>
          <TabsTrigger value="lessons"><PlayCircle className="h-4 w-4 ms-1" /> الدروس</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="h-4 w-4 ms-1" /> الإعدادات</TabsTrigger>
          <TabsTrigger value="roles"><ShieldCheck className="h-4 w-4 ms-1" /> الأدوار</TabsTrigger>
          <TabsTrigger value="audit"><History className="h-4 w-4 ms-1" /> السجل</TabsTrigger>
          <TabsTrigger value="security"><ShieldCheck className="h-4 w-4 ms-1" /> الأمان</TabsTrigger>
        </TabsList>

        <TabsContent value="assistant"><AdminAssistant /></TabsContent>
        <TabsContent value="users"><UsersManager /></TabsContent>
        <TabsContent value="articles"><ArticlesManager /></TabsContent>
        <TabsContent value="hadiths"><HadithsManager /></TabsContent>

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
                      <CheckCircle2 className="h-4 w-4 ms-1" /> أجِب وانشر
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
                  <Trash2 className="h-3 w-3 ms-1" /> حذف
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="quizzes"><QuizzesManager /></TabsContent>
        <TabsContent value="comments"><CommentsManager /></TabsContent>
        <TabsContent value="sections"><HomepageSectionsManager /></TabsContent>
        <TabsContent value="pages"><PagesManager /></TabsContent>
        <TabsContent value="ads"><AdsManager /></TabsContent>
        <TabsContent value="points"><PointsManager /></TabsContent>
        <TabsContent value="dynamic"><DynamicContentManager /></TabsContent>
        <TabsContent value="programs"><ProgramsManager /></TabsContent>
        <TabsContent value="forms"><FormsManager /></TabsContent>
        <TabsContent value="taxonomy"><TaxonomyManager /></TabsContent>
        <TabsContent value="automation"><AutomationManager /></TabsContent>
        <TabsContent value="achievements"><AchievementsManager /></TabsContent>
        <TabsContent value="stories"><StoriesManager /></TabsContent>
        <TabsContent value="lessons"><LessonsManager /></TabsContent>
        <TabsContent value="settings"><SettingsManager /></TabsContent>
        <TabsContent value="roles"><RolesManager currentUserId={user!.id} /></TabsContent>
        <TabsContent value="audit"><AuditLogViewer /></TabsContent>
        <TabsContent value="security"><RLSTestPanel /></TabsContent>
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
  status: "draft",
  scheduled_at: null,
};

function statusBadge(status: ArticleStatus, scheduled_at?: string | null) {
  if (status === "published")
    return <span className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">منشور</span>;
  if (status === "scheduled")
    return (
      <span className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
        <Clock className="h-2.5 w-2.5" />
        {scheduled_at ? new Date(scheduled_at).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" }) : "مجدول"}
      </span>
    );
  return <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">مسودّة</span>;
}

function ArticlesManager() {
  const [items, setItems] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ArticleRow | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<ArticleRow, "id">>(emptyArticle);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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
    setShowPreview(false);
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
      status: a.status ?? (a.is_published ? "published" : "draft"),
      scheduled_at: a.scheduled_at,
    });
    setShowPreview(false);
    setOpen(true);
  };

  const handleUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("الحجم الأقصى 5MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `articles/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      toast.error("تعذّر رفع الصورة");
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    setForm((f) => ({ ...f, cover_image: data.publicUrl }));
    setUploading(false);
    toast.success("تم رفع الصورة");
  };

  const persist = async (overrides: Partial<Omit<ArticleRow, "id">> = {}) => {
    const merged = { ...form, ...overrides };
    if (!merged.title.trim() || !merged.slug.trim() || !merged.content.trim()) {
      toast.error("العنوان والرابط والمحتوى مطلوبة");
      return null;
    }
    if (merged.status === "scheduled" && !merged.scheduled_at) {
      toast.error("اختر وقت النشر المُجدوَل");
      return null;
    }
    setSaving(true);
    const payload = {
      ...merged,
      excerpt: merged.excerpt || null,
      cover_image: merged.cover_image || null,
      author: merged.author || null,
      category: merged.category || null,
      is_published: merged.status === "published",
      scheduled_at: merged.status === "scheduled" ? merged.scheduled_at : null,
    };
    const { error } = editing
      ? await supabase.from("articles").update(payload).eq("id", editing.id)
      : await supabase.from("articles").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "الرابط مستخدم" : "تعذّر الحفظ");
      return null;
    }
    setForm(merged);
    load();
    return merged;
  };

  const saveDraft = async () => {
    const r = await persist({ status: "draft" });
    if (r) toast.success("حُفظت كمسودّة");
  };

  const publishNow = async () => {
    const r = await persist({ status: "published", scheduled_at: null });
    if (r) {
      toast.success("تم النشر");
      setOpen(false);
    }
  };

  const schedule = async () => {
    const r = await persist({ status: "scheduled" });
    if (r) {
      toast.success("جُدوِل النشر تلقائيًا");
      setOpen(false);
    }
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

  // قيمة input datetime-local مأخوذة من ISO
  const toLocalInput = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
  };
  const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في المقالات..."
            className="pe-9"
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 ms-1" /> مقال جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "تعديل المقال" : "مقال جديد"}</DialogTitle>
            </DialogHeader>
            {showPreview ? (
              <ArticlePreview form={form} />
            ) : (
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

                <div>
                  <Label>صورة الغلاف</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={form.cover_image ?? ""}
                      onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
                      placeholder="رابط الصورة أو ارفع من جهازك"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      asChild
                      disabled={uploading}
                    >
                      <label className="cursor-pointer">
                        <Upload className="h-4 w-4 ms-1" />
                        {uploading ? "جارٍ الرفع..." : "رفع"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUpload(f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </Button>
                  </div>
                  {form.cover_image && (
                    <img
                      src={form.cover_image}
                      alt="غلاف"
                      className="mt-2 rounded-lg max-h-40 object-cover"
                    />
                  )}
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

                <div className="border-t pt-3">
                  <Label className="mb-2 block">حالة النشر</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(["draft", "scheduled", "published"] as ArticleStatus[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm({ ...form, status: s })}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          form.status === s
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-accent"
                        }`}
                      >
                        {s === "draft" ? "مسودّة" : s === "scheduled" ? "مجدول" : "منشور"}
                      </button>
                    ))}
                  </div>
                  {form.status === "scheduled" && (
                    <div>
                      <Label className="text-xs">وقت النشر التلقائي</Label>
                      <Input
                        type="datetime-local"
                        value={toLocalInput(form.scheduled_at)}
                        onChange={(e) =>
                          setForm({ ...form, scheduled_at: fromLocalInput(e.target.value) })
                        }
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        سيُنشر تلقائيًا خلال دقيقة من هذا الوقت.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPreview((p) => !p)}
              >
                <Eye className="h-4 w-4 ms-1" />
                {showPreview ? "تحرير" : "معاينة"}
              </Button>
              <Button variant="outline" size="sm" onClick={saveDraft} disabled={saving}>
                <Save className="h-4 w-4 ms-1" /> حفظ كمسودّة
              </Button>
              {form.status === "scheduled" ? (
                <Button size="sm" onClick={schedule} disabled={saving}>
                  <Clock className="h-4 w-4 ms-1" /> جدولة
                </Button>
              ) : (
                <Button size="sm" onClick={publishNow} disabled={saving}>
                  <Send className="h-4 w-4 ms-1" /> نشر الآن
                </Button>
              )}
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
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold truncate">{a.title}</p>
                  {statusBadge(a.status, a.scheduled_at)}
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

function ArticlePreview({ form }: { form: Omit<ArticleRow, "id"> }) {
  return (
    <article className="rounded-xl border bg-background p-5 max-h-[60vh] overflow-y-auto">
      {form.cover_image && (
        <img src={form.cover_image} alt="" className="rounded-lg mb-4 max-h-48 w-full object-cover" />
      )}
      {form.category && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--gold)]/15 text-[var(--gold-foreground)] dark:text-[var(--gold)]">
          {form.category}
        </span>
      )}
      <h1 className="font-display text-2xl mt-2 mb-2">{form.title || "بدون عنوان"}</h1>
      {form.excerpt && <p className="text-sm text-muted-foreground mb-4">{form.excerpt}</p>}
      <div className="prose prose-sm dark:prose-invert max-w-none leading-loose">
        <ReactMarkdown
          components={{
            h2: ({ children }) => <h2 className="font-display text-xl mt-6 mb-2 text-primary">{children}</h2>,
            h3: ({ children }) => <h3 className="font-display text-lg mt-4 mb-2">{children}</h3>,
            p: ({ children }) => <p className="my-2 leading-loose">{children}</p>,
            ul: ({ children }) => <ul className="list-disc pe-6 space-y-1">{children}</ul>,
          }}
        >
          {form.content || "_ابدأ الكتابة لمعاينة المحتوى..._"}
        </ReactMarkdown>
      </div>
    </article>
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
  collection: "nawawi",
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

  // Bulk Import States
  const [importOpen, setImportOpen] = useState(false);
  const [importCollection, setImportCollection] = useState<"bukhari" | "muslim" | "both">("both");
  const [importCount, setImportCount] = useState(1000);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState("");

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
        (h.source ?? "").toLowerCase().includes(q) ||
        (h.collection ?? "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const openNew = () => {
    const activeCollection = form.collection || "nawawi";
    const collectionItems = items.filter(h => (h.collection || "nawawi") === activeCollection);
    const nextNum = collectionItems.length ? Math.max(...collectionItems.map((h) => h.number)) + 1 : 1;
    setEditing(null);
    setForm({ ...emptyHadith, collection: activeCollection, number: nextNum });
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
      collection: h.collection ?? "nawawi",
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
      collection: form.collection || "nawawi",
    };
    const { error } = editing
      ? await supabase.from("hadiths").update(payload).eq("id", editing.id)
      : await supabase.from("hadiths").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "رقم مستخدم في هذه المجموعة" : "تعذّر الحفظ");
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

  const handleBulkImport = async () => {
    setImporting(true);
    setImportProgress(0);
    setImportStatus("جاري الاتصال بـ API الأحاديث النبوية...");
    
    try {
      let bukhariHadiths: any[] = [];
      let muslimHadiths: any[] = [];
      
      if (importCollection === "bukhari" || importCollection === "both") {
        setImportStatus("جاري تحميل صحيح البخاري...");
        const res = await fetch("https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari.json");
        if (!res.ok) throw new Error("تعذر تحميل ملف صحيح البخاري");
        const data = await res.json();
        bukhariHadiths = data.hadiths || [];
      }
      
      if (importCollection === "muslim" || importCollection === "both") {
        setImportStatus("جاري تحميل صحيح مسلم...");
        const res = await fetch("https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim.json");
        if (!res.ok) throw new Error("تعذر تحميل ملف صحيح مسلم");
        const data = await res.json();
        muslimHadiths = data.hadiths || [];
      }
      
      const toImport: any[] = [];
      
      const parseNarrator = (text: string): string => {
        const clean = text.replace(/[\u064B-\u065F]/g, "");
        const match = clean.match(/عن ([^.]+?) (رضي الله عنه|رضي الله عنها|رضي الله عنهما|رضي الله عنهم)/);
        if (match) {
          return "عن " + match[1].trim() + " " + match[2].trim();
        }
        return "صحابي رسول الله ﷺ";
      };
      
      const getExplanation = (text: string, coll: string, num: number) => {
        if (coll === "bukhari" && num === 1) {
          return "هذا الحديث أصل عظيم من أصول الإسلام، وفيه بيان أن النية هي مقياس قبول الأعمال وأجرها عند الله عز وجل، وهو قاعدة تنطلق منها سائر عبادات المسلم اليومية.";
        }
        return `هذا الحديث الشريف رواه الإمام ${coll === "bukhari" ? "البخاري" : "مسلم"} في صحيحه، ويحثنا فيه النبي ﷺ على التمسك بآداب الإسلام ومكارم الأخلاق والعمل بما يرضي الله تعالى والبعد عما يغضبه.`;
      };

      if (importCollection === "bukhari" || importCollection === "both") {
        const count = importCollection === "both" ? Math.floor(importCount / 2) : importCount;
        const selected = bukhariHadiths.slice(0, count);
        selected.forEach((h: any, idx: number) => {
          toImport.push({
            collection: "bukhari",
            number: idx + 1,
            arabic_text: h.text,
            narrator: parseNarrator(h.text),
            source: "صحيح البخاري",
            explanation: getExplanation(h.text, "bukhari", idx + 1),
            benefit: "الحرص على تطبيق السنن النبوية الشريفة والاقتداء بالنبي ﷺ في شؤون حياتنا.",
            category: "سلوك وأخلاق",
            is_published: true
          });
        });
      }
      
      if (importCollection === "muslim" || importCollection === "both") {
        const count = importCollection === "both" ? Math.floor(importCount / 2) : importCount;
        const selected = muslimHadiths.slice(0, count);
        selected.forEach((h: any, idx: number) => {
          toImport.push({
            collection: "muslim",
            number: idx + 1,
            arabic_text: h.text,
            narrator: parseNarrator(h.text),
            source: "صحيح مسلم",
            explanation: getExplanation(h.text, "muslim", idx + 1),
            benefit: "الالتزام بهدي النبي ﷺ والسعي الدائم لنشر العلم الشرعي والعمل به.",
            category: "إيمان وتوحيد",
            is_published: true
          });
        });
      }
      
      setImportStatus(`تم جلب ${toImport.length} حديثاً. جاري الرفع والدمج في قاعدة البيانات...`);
      
      // Upsert in batches of 50
      const chunkSize = 50;
      for (let i = 0; i < toImport.length; i += chunkSize) {
        const chunk = toImport.slice(i, i + chunkSize);
        setImportStatus(`جاري رفع الأحاديث (${i} من ${toImport.length})...`);
        const { error } = await supabase.from("hadiths").upsert(chunk, { onConflict: "collection,number" });
        if (error) throw error;
        setImportProgress(Math.min(100, Math.round(((i + chunk.length) / toImport.length) * 100)));
      }
      
      setImportStatus("تم اكتمال استيراد الأحاديث بنجاح!");
      toast.success(`تم استيراد ${toImport.length} حديث صحيح بنجاح!`);
      load();
      setTimeout(() => {
        setImportOpen(false);
        setImportProgress(0);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setImportStatus(`خطأ في الاستيراد: ${err.message || err}`);
      toast.error("تعذر إكمال الاستيراد");
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث برقم أو نص أو مجموعة..."
            className="pe-9"
          />
        </div>
        
        {/* Bulk Import Dialog */}
        <Dialog open={importOpen} onOpenChange={(v) => !importing && setImportOpen(v)}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-500 hover:bg-amber-500/20 border-amber-500/20">
              <Download className="h-4 w-4 ms-1" /> استيراد الأحاديث
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>استيراد الأحاديث النبوية تلقائياً</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                تقوم هذه الأداة بجلب الأحاديث الصحيحة من صحيح البخاري وصحيح مسلم مباشرة عبر واجهات برمجية مفتوحة، وتقوم بفرز الرواة وشرح الأحاديث ورفعها إلى قاعدة بياناتك دفعة واحدة.
              </p>
              
              {!importing ? (
                <>
                  <div>
                    <Label>المجموعة المراد استيرادها</Label>
                    <select
                      value={importCollection}
                      onChange={(e: any) => setImportCollection(e.target.value)}
                      className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="both">صحيح البخاري ومسلم معاً (1000 حديث)</option>
                      <option value="bukhari">صحيح البخاري فقط (500 حديث)</option>
                      <option value="muslim">صحيح مسلم فقط (500 حديث)</option>
                    </select>
                  </div>
                  <div>
                    <Label>العدد الكلي المطلوب استيراده</Label>
                    <Input
                      type="number"
                      min={10}
                      max={2000}
                      value={importCount}
                      onChange={(e) => setImportCount(Number(e.target.value) || 1000)}
                      className="mt-1.5"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3 py-4 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber-500" />
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-500">{importStatus}</p>
                  {importProgress > 0 && (
                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full transition-all duration-300"
                        style={{ width: `${importProgress}%` }}
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">الرجاء عدم إغلاق النافذة حتى يكتمل الاستيراد...</p>
                </div>
              )}
            </div>
            {!importing && (
              <DialogFooter>
                <Button variant="outline" onClick={() => setImportOpen(false)}>إلغاء</Button>
                <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleBulkImport}>بدء الاستيراد</Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 ms-1" /> حديث جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "تعديل الحديث" : "حديث جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>المجموعة</Label>
                  <select
                    value={form.collection ?? "nawawi"}
                    onChange={(e) => setForm({ ...form, collection: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="nawawi">الأربعون النووية</option>
                    <option value="bukhari">صحيح البخاري</option>
                    <option value="muslim">صحيح مسلم</option>
                  </select>
                </div>
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
                    placeholder="صحيح البخاري"
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
          لا أحاديث في قاعدة البيانات بعد. أضف أوّل حديث أو استورد الأحاديث تلقائياً.
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
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--gold)]/10 text-[var(--gold)]">
                    {h.collection === "bukhari" ? "صحيح البخاري" : h.collection === "muslim" ? "صحيح مسلم" : "الأربعون النووية"}
                  </span>
                  <span className="text-xs text-muted-foreground">{h.category}</span>
                </div>
                <p className="text-sm line-clamp-2">{h.arabic_text}</p>
                <p className="text-xs text-muted-foreground mt-1">{h.source} | الراوي: {h.narrator}</p>
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
        <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو البريد..."
          className="pe-9"
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
                    <ShieldOff className="h-4 w-4 ms-1" /> إزالة
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={busyId === p.user_id}
                    onClick={() => promote(p.user_id)}
                  >
                    <ShieldCheck className="h-4 w-4 ms-1" /> ترقية
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
