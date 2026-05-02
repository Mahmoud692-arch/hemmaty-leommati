import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Search, Eye, Award, BookOpen, ScrollText, MessageCircleQuestion, Trophy, Shield, Mail, Phone, Calendar, Globe } from "lucide-react";
import { toast } from "sonner";

const maskEmail = (e: string) => {
  if (!e) return "—";
  const [u, d] = e.split("@");
  if (!d) return "•••";
  return `${u.slice(0, 2)}•••@${d}`;
};
const maskPhone = (p: string | null) => p ? `${p.slice(0, 3)}•••${p.slice(-2)}` : "—";
const maskDob = (d: string | null) => d ? `••••-${d.slice(5, 7)}-••` : "—";

interface ProfileFull {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  country: string | null;
  level: number;
  total_points: number;
  articles_read: number;
  hadiths_read: number;
  quizzes_passed: number;
  created_at: string;
}

interface UserDetail {
  profile: ProfileFull;
  roles: string[];
  badges: { badge_key: string; earned_at: string }[];
  questionsCount: number;
  commentsCount: number;
  attempts: { quiz_title: string; score: number | null; max_score: number | null; submitted_at: string | null }[];
}

export default function UsersManager() {
  const [users, setUsers] = useState<ProfileFull[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: profs }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setUsers((profs ?? []) as ProfileFull[]);
    setAdminIds(new Set((roles ?? []).filter((r) => r.role === "admin" || r.role === "super_admin").map((r) => r.user_id)));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.country?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const openDetail = async (p: ProfileFull) => {
    setLoadingDetail(true);
    setDetail({ profile: p, roles: [], badges: [], questionsCount: 0, commentsCount: 0, attempts: [] });
    const [{ data: rs }, { data: bs }, { count: qc }, { count: cc }, { data: atts }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", p.user_id),
      supabase.from("user_badges").select("badge_key, earned_at").eq("user_id", p.user_id),
      supabase.from("user_questions").select("*", { count: "exact", head: true }).eq("user_id", p.user_id),
      supabase.from("article_comments").select("*", { count: "exact", head: true }).eq("user_id", p.user_id),
      supabase.from("quiz_attempts").select("score, max_score, submitted_at, quiz_id").eq("user_id", p.user_id),
    ]);
    // fetch quiz titles
    const quizIds = Array.from(new Set((atts ?? []).map((a) => a.quiz_id)));
    const { data: qz } = quizIds.length
      ? await supabase.from("quizzes").select("id, title").in("id", quizIds)
      : { data: [] as { id: string; title: string }[] };
    const titleMap = new Map((qz ?? []).map((q) => [q.id, q.title]));
    setDetail({
      profile: p,
      roles: (rs ?? []).map((r) => r.role),
      badges: (bs ?? []) as { badge_key: string; earned_at: string }[],
      questionsCount: qc ?? 0,
      commentsCount: cc ?? 0,
      attempts: (atts ?? []).map((a) => ({
        quiz_title: titleMap.get(a.quiz_id) ?? "—",
        score: a.score, max_score: a.max_score, submitted_at: a.submitted_at,
      })),
    });
    setLoadingDetail(false);
  };

  const exportCsv = () => {
    const header = ["الاسم", "البريد", "الهاتف", "تاريخ الميلاد", "البلد", "النقاط", "المستوى", "مقالات مقروءة", "أحاديث", "كويزات", "مدير", "تاريخ التسجيل"];
    const rows = filtered.map((u) => [
      u.full_name, u.email, u.phone ?? "", u.date_of_birth ?? "", u.country ?? "",
      u.total_points, u.level, u.articles_read, u.hadiths_read, u.quizzes_passed,
      adminIds.has(u.user_id) ? "نعم" : "لا",
      new Date(u.created_at).toLocaleDateString("ar-EG"),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `users-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير القائمة");
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم، البريد، الهاتف، البلد..."
            className="pr-9"
          />
        </div>
        <Button variant="outline" onClick={exportCsv}>تصدير CSV</Button>
        <span className="text-xs text-muted-foreground">المجموع: {filtered.length}</span>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">جارٍ تحميل المستخدمين…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground rounded-xl border border-dashed">لا نتائج</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs">
              <tr>
                <th className="p-2 text-right">الاسم</th>
                <th className="p-2 text-right">البريد</th>
                <th className="p-2 text-right">الهاتف</th>
                <th className="p-2 text-right">البلد</th>
                <th className="p-2 text-right">النقاط</th>
                <th className="p-2 text-right">المستوى</th>
                <th className="p-2 text-right">الدور</th>
                <th className="p-2 text-right">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.user_id} className="border-t hover:bg-accent/30">
                  <td className="p-2 font-medium">{u.full_name}</td>
                  <td className="p-2 text-xs" dir="ltr">{u.email}</td>
                  <td className="p-2 text-xs" dir="ltr">{u.phone ?? "—"}</td>
                  <td className="p-2 text-xs">{u.country ?? "—"}</td>
                  <td className="p-2 font-bold text-primary">{u.total_points}</td>
                  <td className="p-2">{u.level}</td>
                  <td className="p-2">
                    {adminIds.has(u.user_id) ? (
                      <span className="text-[10px] bg-[var(--gold)]/15 text-[var(--gold)] px-2 py-0.5 rounded-full">مدير</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">عضو</span>
                    )}
                  </td>
                  <td className="p-2">
                    <Button size="sm" variant="outline" onClick={() => openDetail(u)}>
                      <Eye className="h-3 w-3 ml-1" /> تفاصيل
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>بيانات المستخدم</DialogTitle>
          </DialogHeader>
          {loadingDetail || !detail ? (
            <div className="text-center py-6 text-muted-foreground">جارٍ التحميل…</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border p-4">
                <div className="text-lg font-bold mb-3">{detail.profile.full_name}</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Item icon={Mail} label="البريد" value={detail.profile.email} ltr />
                  <Item icon={Phone} label="الهاتف" value={detail.profile.phone ?? "—"} ltr />
                  <Item icon={Calendar} label="تاريخ الميلاد" value={detail.profile.date_of_birth ?? "—"} />
                  <Item icon={Globe} label="البلد" value={detail.profile.country ?? "—"} />
                  <Item icon={Calendar} label="تاريخ التسجيل" value={new Date(detail.profile.created_at).toLocaleDateString("ar-EG")} />
                  <Item icon={Shield} label="الأدوار" value={detail.roles.length ? detail.roles.join("، ") : "user"} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat icon={Trophy} label="النقاط" value={detail.profile.total_points} />
                <Stat icon={Award} label="المستوى" value={detail.profile.level} />
                <Stat icon={BookOpen} label="مقالات" value={detail.profile.articles_read} />
                <Stat icon={ScrollText} label="أحاديث" value={detail.profile.hadiths_read} />
                <Stat icon={Trophy} label="كويزات ناجحة" value={detail.profile.quizzes_passed} />
                <Stat icon={MessageCircleQuestion} label="أسئلة طُرحت" value={detail.questionsCount} />
                <Stat icon={MessageCircleQuestion} label="تعليقات" value={detail.commentsCount} />
                <Stat icon={Award} label="شارات" value={detail.badges.length} />
              </div>

              {detail.badges.length > 0 && (
                <div className="rounded-xl border p-3">
                  <div className="text-sm font-semibold mb-2">الشارات</div>
                  <div className="flex flex-wrap gap-2">
                    {detail.badges.map((b, i) => (
                      <span key={i} className="text-xs bg-[var(--gold)]/15 text-[var(--gold)] px-2 py-1 rounded-full">
                        {b.badge_key}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {detail.attempts.length > 0 && (
                <div className="rounded-xl border p-3">
                  <div className="text-sm font-semibold mb-2">محاولات الكويزات</div>
                  <div className="space-y-1">
                    {detail.attempts.map((a, i) => (
                      <div key={i} className="flex justify-between text-xs border-b pb-1">
                        <span>{a.quiz_title}</span>
                        <span className="font-bold">{a.score ?? "—"} / {a.max_score ?? "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Item({ icon: Icon, label, value, ltr }: { icon: typeof Mail; label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="truncate" dir={ltr ? "ltr" : undefined}>{value}</div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: number }) {
  return (
    <div className="rounded-xl border p-3 text-center">
      <Icon className="h-4 w-4 mx-auto text-[var(--gold)] mb-1" />
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
