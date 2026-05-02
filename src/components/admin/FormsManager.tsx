import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ClipboardList, Eye } from "lucide-react";
import { toast } from "sonner";

interface Form {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  form_type: string;
  fields: unknown;
  settings: Record<string, unknown>;
  is_published: boolean;
}

const empty = {
  slug: "", title: "", description: "", form_type: "survey", is_published: false,
};
const sampleFields = `[
  { "name": "rating", "label": "تقييمك", "type": "number", "required": true },
  { "name": "comment", "label": "ملاحظاتك", "type": "textarea" }
]`;

export default function FormsManager() {
  const [items, setItems] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Form | null>(null);
  const [form, setForm] = useState(empty);
  const [fieldsText, setFieldsText] = useState(sampleFields);
  const [settingsText, setSettingsText] = useState("{}");
  const [submissions, setSubmissions] = useState<Form | null>(null);
  const [subs, setSubs] = useState<Array<{ id: string; data: unknown; created_at: string; user_id: string | null }>>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("interactive_forms").select("*").order("created_at", { ascending: false });
    setItems(((data ?? []) as unknown) as Form[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null); setForm(empty); setFieldsText(sampleFields); setSettingsText("{}"); setOpen(true);
  };
  const openEdit = (f: Form) => {
    setEditing(f);
    setForm({ slug: f.slug, title: f.title, description: f.description ?? "", form_type: f.form_type, is_published: f.is_published });
    setFieldsText(JSON.stringify(f.fields ?? [], null, 2));
    setSettingsText(JSON.stringify(f.settings ?? {}, null, 2));
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.slug.trim()) { toast.error("العنوان والمعرّف مطلوبان"); return; }
    let fields: unknown, settings: unknown;
    try { fields = JSON.parse(fieldsText || "[]"); } catch { toast.error("Fields ليس JSON صالح"); return; }
    try { settings = JSON.parse(settingsText || "{}"); } catch { toast.error("Settings ليس JSON صالح"); return; }
    const payload = { ...form, fields, settings, ...(editing ? { id: editing.id } : {}) };
    const { error } = await supabase.rpc("admin_upsert_form", { _payload: payload as never });
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحفظ"); setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف النموذج؟")) return;
    const { error } = await supabase.from("interactive_forms").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف"); load();
  };

  const viewSubs = async (f: Form) => {
    setSubmissions(f);
    const { data } = await supabase.from("form_submissions").select("id,data,created_at,user_id").eq("form_id", f.id).order("created_at", { ascending: false });
    setSubs((data ?? []) as never);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold flex items-center gap-2"><ClipboardList className="h-4 w-4 text-[var(--gold)]" /> النماذج التفاعلية</h2>
        <Button onClick={openNew}><Plus className="h-3 w-3 ml-1" /> نموذج جديد</Button>
      </div>

      {loading ? <p className="text-muted-foreground">جارٍ التحميل…</p> : items.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-6 text-center">لا نماذج بعد.</p>
      ) : (
        <div className="space-y-2">
          {items.map((f) => (
            <div key={f.id} className="card-elegant rounded-xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-bold flex items-center gap-2">
                  {f.title}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted">{f.form_type}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${f.is_published ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700"}`}>
                    {f.is_published ? "منشور" : "مسودّة"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground" dir="ltr">{f.slug}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => viewSubs(f)} title="الردود"><Eye className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => openEdit(f)}><Pencil className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => remove(f.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل نموذج" : "نموذج جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>العنوان *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>المعرّف *</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} dir="ltr" /></div>
            </div>
            <div><Label>الوصف</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div>
              <Label>النوع</Label>
              <select value={form.form_type} onChange={(e) => setForm({ ...form, form_type: e.target.value })} className="w-full h-9 rounded-md border bg-background px-2 text-sm">
                <option value="survey">استبيان</option>
                <option value="contact">تواصل</option>
                <option value="application">طلب اشتراك</option>
                <option value="feedback">تغذية راجعة</option>
              </select>
            </div>
            <div>
              <Label>الحقول (JSON Array)</Label>
              <Textarea rows={6} className="font-mono text-xs" value={fieldsText} onChange={(e) => setFieldsText(e.target.value)} />
              <p className="text-[10px] text-muted-foreground mt-1">{`أنواع الحقول: text, textarea, number, email, select`}</p>
            </div>
            <div>
              <Label>الإعدادات (JSON)</Label>
              <Textarea rows={3} className="font-mono text-xs" value={settingsText} onChange={(e) => setSettingsText(e.target.value)} />
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} /><span className="text-sm">منشور</span></div>
          </div>
          <DialogFooter><Button onClick={save}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!submissions} onOpenChange={(o) => !o && setSubmissions(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>ردود نموذج «{submissions?.title}» ({subs.length})</DialogTitle></DialogHeader>
          {subs.length === 0 ? <p className="text-sm text-muted-foreground">لا ردود بعد.</p> : (
            <div className="space-y-2">
              {subs.map((s) => (
                <div key={s.id} className="card-elegant rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground mb-2">{new Date(s.created_at).toLocaleString("ar-EG")}</div>
                  <pre className="text-xs whitespace-pre-wrap" dir="ltr">{JSON.stringify(s.data, null, 2)}</pre>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
