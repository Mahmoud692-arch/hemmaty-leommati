import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, FileStack } from "lucide-react";
import { toast } from "sonner";

interface Item {
  id: string;
  content_type: string;
  slug: string | null;
  title: string;
  body: Record<string, unknown>;
  metadata: Record<string, unknown>;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
}

const empty = {
  content_type: "announcement", slug: "", title: "",
  body: { text: "" } as Record<string, unknown>,
  metadata: {} as Record<string, unknown>,
  status: "draft", scheduled_at: null as string | null,
};

export default function DynamicContentManager() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState(empty);
  const [bodyText, setBodyText] = useState("{}");
  const [metaText, setMetaText] = useState("{}");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("dynamic_content").select("*").order("created_at", { ascending: false });
    setItems(((data ?? []) as unknown) as Item[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null); setForm(empty);
    setBodyText(JSON.stringify(empty.body, null, 2));
    setMetaText("{}"); setOpen(true);
  };
  const openEdit = (it: Item) => {
    setEditing(it);
    setForm({
      content_type: it.content_type, slug: it.slug ?? "", title: it.title,
      body: it.body, metadata: it.metadata, status: it.status, scheduled_at: it.scheduled_at,
    });
    setBodyText(JSON.stringify(it.body ?? {}, null, 2));
    setMetaText(JSON.stringify(it.metadata ?? {}, null, 2));
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.content_type.trim()) { toast.error("النوع والعنوان مطلوبان"); return; }
    let body: unknown, metadata: unknown;
    try { body = JSON.parse(bodyText || "{}"); } catch { toast.error("Body ليس JSON صالح"); return; }
    try { metadata = JSON.parse(metaText || "{}"); } catch { toast.error("Metadata ليس JSON صالح"); return; }
    const payload = { ...form, body, metadata, ...(editing ? { id: editing.id } : {}) };
    const { error } = await supabase.rpc("admin_upsert_dynamic_content", { _payload: payload });
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحفظ"); setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا المحتوى؟")) return;
    const { error } = await supabase.rpc("admin_delete_dynamic_content", { _id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف"); load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold flex items-center gap-2"><FileStack className="h-4 w-4 text-[var(--gold)]" /> المحتوى الديناميكي</h2>
        <Button onClick={openNew}><Plus className="h-3 w-3 ml-1" /> محتوى جديد</Button>
      </div>

      {loading ? <p className="text-muted-foreground">جارٍ التحميل…</p> : items.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-6 text-center">لا محتوى بعد.</p>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="card-elegant rounded-xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-bold flex items-center gap-2">
                  {it.title}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted">{it.content_type}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${it.status === "published" ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700"}`}>
                    {it.status}
                  </span>
                </div>
                {it.slug && <p className="text-xs text-muted-foreground" dir="ltr">{it.slug}</p>}
              </div>
              <Button size="sm" variant="ghost" onClick={() => openEdit(it)}><Pencil className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => remove(it.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل محتوى" : "محتوى ديناميكي جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>النوع *</Label><Input value={form.content_type} onChange={(e) => setForm({ ...form, content_type: e.target.value })} placeholder="announcement, banner, faq…" dir="ltr" /></div>
              <div>
                <Label>الحالة</Label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full h-9 rounded-md border bg-background px-2 text-sm">
                  <option value="draft">مسودّة</option>
                  <option value="scheduled">مجدول</option>
                  <option value="published">منشور</option>
                </select>
              </div>
            </div>
            <div><Label>العنوان *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>المعرّف (slug)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} dir="ltr" /></div>
            <div>
              <Label>المحتوى (JSON)</Label>
              <Textarea rows={6} className="font-mono text-xs" value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
            </div>
            <div>
              <Label>بيانات إضافية (JSON)</Label>
              <Textarea rows={3} className="font-mono text-xs" value={metaText} onChange={(e) => setMetaText(e.target.value)} />
            </div>
            {form.status === "scheduled" && (
              <div><Label>وقت النشر</Label>
                <Input type="datetime-local"
                  value={form.scheduled_at ? form.scheduled_at.slice(0, 16) : ""}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </div>
            )}
          </div>
          <DialogFooter><Button onClick={save}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
