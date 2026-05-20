import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Compass, Users } from "lucide-react";
import { toast } from "sonner";

interface Program {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  program_type: string;
  config: Record<string, unknown>;
  is_published: boolean;
}

const empty = {
  slug: "", title: "", description: "", cover_image: "",
  program_type: "journey", is_published: false,
};

export default function ProgramsManager() {
  const [items, setItems] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Program | null>(null);
  const [form, setForm] = useState(empty);
  const [configText, setConfigText] = useState("{}");
  const [assignOpen, setAssignOpen] = useState<Program | null>(null);
  const [userIds, setUserIds] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("programs").select("*").order("created_at", { ascending: false });
    setItems(((data ?? []) as unknown) as Program[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null); setForm(empty); setConfigText("{}"); setOpen(true);
  };
  const openEdit = (p: Program) => {
    setEditing(p);
    setForm({
      slug: p.slug, title: p.title, description: p.description ?? "",
      cover_image: p.cover_image ?? "", program_type: p.program_type,
      is_published: p.is_published,
    });
    setConfigText(JSON.stringify(p.config ?? {}, null, 2));
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.slug.trim()) { toast.error("العنوان والمعرّف مطلوبان"); return; }
    let config: unknown;
    try { config = JSON.parse(configText || "{}"); } catch { toast.error("Config ليس JSON صالح"); return; }
    const payload = { ...form, config, ...(editing ? { id: editing.id } : {}) };
    const { error } = await supabase.rpc("admin_upsert_program", { _payload: payload as never });
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحفظ"); setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف البرنامج؟")) return;
    const { error } = await supabase.from("programs").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف"); load();
  };

  const assign = async () => {
    if (!assignOpen) return;
    const ids = userIds.split(/[,\s]+/).filter(Boolean);
    if (ids.length === 0) { toast.error("أدخل user IDs"); return; }
    const { data, error } = await supabase.rpc("admin_assign_program", {
      _program_id: assignOpen.id, _user_ids: ids,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`تم تسجيل ${data} مستخدم`);
    setAssignOpen(null); setUserIds("");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold flex items-center gap-2"><Compass className="h-4 w-4 text-[var(--gold)]" /> البرامج والرحلات</h2>
        <Button onClick={openNew}><Plus className="h-3 w-3 ms-1" /> برنامج جديد</Button>
      </div>

      {loading ? <p className="text-muted-foreground">جارٍ التحميل…</p> : items.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-6 text-center">لا برامج بعد.</p>
      ) : (
        <div className="space-y-2">
          {items.map((p) => (
            <div key={p.id} className="card-elegant rounded-xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-bold flex items-center gap-2">
                  {p.title}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted">{p.program_type}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${p.is_published ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700"}`}>
                    {p.is_published ? "منشور" : "مسودّة"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground" dir="ltr">{p.slug}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setAssignOpen(p)} title="تسجيل مستخدمين">
                <Users className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل برنامج" : "برنامج جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>العنوان *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>المعرّف *</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} dir="ltr" /></div>
            </div>
            <div><Label>الوصف</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>النوع</Label>
                <select value={form.program_type} onChange={(e) => setForm({ ...form, program_type: e.target.value })} className="w-full h-9 rounded-md border bg-background px-2 text-sm">
                  <option value="journey">رحلة</option>
                  <option value="course">دورة</option>
                  <option value="challenge">تحدي</option>
                </select>
              </div>
              <div><Label>صورة الغلاف</Label><Input value={form.cover_image} onChange={(e) => setForm({ ...form, cover_image: e.target.value })} dir="ltr" /></div>
            </div>
            <div>
              <Label>الإعدادات (JSON)</Label>
              <Textarea rows={5} className="font-mono text-xs" value={configText} onChange={(e) => setConfigText(e.target.value)} />
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} /><span className="text-sm">منشور</span></div>
          </div>
          <DialogFooter><Button onClick={save}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!assignOpen} onOpenChange={(o) => !o && setAssignOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>تسجيل مستخدمين في «{assignOpen?.title}»</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>User IDs (مفصولة بفواصل أو أسطر)</Label>
            <Textarea rows={5} value={userIds} onChange={(e) => setUserIds(e.target.value)} dir="ltr" placeholder="uuid1, uuid2…" />
          </div>
          <DialogFooter><Button onClick={assign}>تسجيل</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
