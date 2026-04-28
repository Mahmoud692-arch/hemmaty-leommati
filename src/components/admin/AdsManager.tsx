import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Megaphone } from "lucide-react";
import { toast } from "sonner";

interface Ad {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  link_url: string | null;
  position: string;
  order_index: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

const empty: Omit<Ad, "id"> = {
  title: "", body: "", image_url: "", link_url: "", position: "top",
  order_index: 0, starts_at: null, ends_at: null, is_active: true,
};

export default function AdsManager() {
  const [items, setItems] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ad | null>(null);
  const [form, setForm] = useState<Omit<Ad, "id">>(empty);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("homepage_ads").select("*").order("order_index");
    setItems((data ?? []) as Ad[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (a: Ad) => {
    setEditing(a);
    setForm({ ...a, body: a.body ?? "", image_url: a.image_url ?? "", link_url: a.link_url ?? "" });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error("العنوان مطلوب"); return; }
    const payload = { ...form, ...(editing ? { id: editing.id } : {}) };
    const { error } = await supabase.rpc("admin_upsert_ad", { _payload: payload });
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحفظ");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف الإعلان؟")) return;
    const { error } = await supabase.from("homepage_ads").delete().eq("id", id);
    if (error) { toast.error("تعذّر الحذف"); return; }
    toast.success("تم الحذف");
    load();
  };

  const toggle = async (a: Ad) => {
    await supabase.from("homepage_ads").update({ is_active: !a.is_active }).eq("id", a.id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold flex items-center gap-2"><Megaphone className="h-4 w-4 text-[var(--gold)]" /> إعلانات الرئيسية</h2>
        <Button onClick={openNew}><Plus className="h-3 w-3 ml-1" /> إعلان جديد</Button>
      </div>

      {loading ? <p className="text-muted-foreground">جارٍ التحميل…</p> : items.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-6 text-center">لا إعلانات بعد.</p>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <div key={a.id} className="card-elegant rounded-xl p-3 flex items-center gap-3">
              {a.image_url && <img src={a.image_url} alt="" className="w-14 h-14 rounded-lg object-cover" />}
              <div className="flex-1 min-w-0">
                <div className="font-bold flex items-center gap-2">
                  {a.title}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${a.is_active ? "bg-emerald-500/15 text-emerald-700" : "bg-muted"}`}>{a.is_active ? "نشط" : "متوقف"}</span>
                  <span className="text-[10px] text-muted-foreground">· {a.position} · #{a.order_index}</span>
                </div>
                {a.body && <p className="text-xs text-muted-foreground line-clamp-1">{a.body}</p>}
              </div>
              <Switch checked={a.is_active} onCheckedChange={() => toggle(a)} />
              <Button size="sm" variant="ghost" onClick={() => openEdit(a)}><Pencil className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "تعديل إعلان" : "إعلان جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>العنوان *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>المحتوى</Label><Textarea rows={3} value={form.body ?? ""} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>رابط الصورة</Label><Input value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} dir="ltr" /></div>
              <div><Label>رابط الإعلان</Label><Input value={form.link_url ?? ""} onChange={(e) => setForm({ ...form, link_url: e.target.value })} dir="ltr" /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>الموقع</Label>
                <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="w-full h-9 rounded-md border bg-background px-2 text-sm">
                  <option value="top">أعلى</option>
                  <option value="middle">وسط</option>
                  <option value="bottom">أسفل</option>
                  <option value="sidebar">جانبي</option>
                </select>
              </div>
              <div><Label>الترتيب</Label><Input type="number" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} /></div>
              <div className="flex items-end gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><span className="text-xs">نشط</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>يبدأ من</Label><Input type="datetime-local" value={form.starts_at ? form.starts_at.slice(0, 16) : ""} onChange={(e) => setForm({ ...form, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
              <div><Label>ينتهي في</Label><Input type="datetime-local" value={form.ends_at ? form.ends_at.slice(0, 16) : ""} onChange={(e) => setForm({ ...form, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={save}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
