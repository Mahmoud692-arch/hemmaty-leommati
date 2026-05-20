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

interface CmsPage {
  id: string;
  parent_id: string | null;
  slug: string;
  title: string;
  content: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  cover_image: string | null;
  show_in_nav: boolean;
  order_index: number;
  is_published: boolean;
}

const empty: Omit<CmsPage, "id"> = {
  parent_id: null, slug: "", title: "", content: "",
  meta_description: "", meta_keywords: "", cover_image: "",
  show_in_nav: true, order_index: 0, is_published: true,
};

export default function PagesManager() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CmsPage | null>(null);
  const [form, setForm] = useState<Omit<CmsPage, "id">>(empty);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("cms_pages").select("*").order("order_index");
    setPages((data ?? []) as CmsPage[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = (parent_id: string | null = null) => {
    setEditing(null);
    setForm({ ...empty, parent_id });
    setOpen(true);
  };

  const openEdit = (p: CmsPage) => {
    setEditing(p);
    setForm({
      parent_id: p.parent_id, slug: p.slug, title: p.title,
      content: p.content ?? "", meta_description: p.meta_description ?? "",
      meta_keywords: p.meta_keywords ?? "", cover_image: p.cover_image ?? "",
      show_in_nav: p.show_in_nav, order_index: p.order_index, is_published: p.is_published,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.slug.trim()) {
      toast.error("العنوان والرابط مطلوبان");
      return;
    }
    const payload = { ...form, ...(editing ? { id: editing.id } : {}) };
    const { error } = await supabase.rpc("admin_upsert_page", { _payload: payload });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "الرابط مستخدم" : error.message);
      return;
    }
    toast.success("تم الحفظ");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف الصفحة وكل الصفحات الفرعية؟")) return;
    const { error } = await supabase.rpc("admin_delete_page", { _page_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف");
    load();
  };

  const top = pages.filter((p) => !p.parent_id);
  const childrenOf = (id: string) => pages.filter((p) => p.parent_id === id);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold flex items-center gap-2"><FileStack className="h-4 w-4 text-[var(--gold)]" /> إدارة الصفحات</h2>
        <Button onClick={() => openNew()}><Plus className="h-3 w-3 ms-1" /> صفحة جديدة</Button>
      </div>

      {loading ? <p className="text-muted-foreground">جارٍ التحميل…</p> : top.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-6 text-center">لا صفحات مخصّصة بعد.</p>
      ) : (
        <div className="space-y-2">
          {top.map((p) => (
            <div key={p.id} className="card-elegant rounded-xl p-3">
              <PageRow p={p} onEdit={() => openEdit(p)} onDelete={() => remove(p.id)} onAddChild={() => openNew(p.id)} />
              {childrenOf(p.id).map((c) => (
                <div key={c.id} className="ms-6 mt-2 border-e-2 border-[var(--gold)]/30 pe-3">
                  <PageRow p={c} onEdit={() => openEdit(c)} onDelete={() => remove(c.id)} onAddChild={null} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل صفحة" : "صفحة جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>العنوان *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>الرابط (slug) *</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} dir="ltr" placeholder="my-page" /></div>
            </div>
            <div>
              <Label>الصفحة الأم</Label>
              <select value={form.parent_id ?? ""} onChange={(e) => setForm({ ...form, parent_id: e.target.value || null })} className="w-full h-9 rounded-md border bg-background px-2 text-sm">
                <option value="">— صفحة رئيسية —</option>
                {top.filter((p) => p.id !== editing?.id).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div><Label>المحتوى (Markdown)</Label><Textarea rows={8} value={form.content ?? ""} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>الوصف (SEO)</Label><Textarea rows={2} value={form.meta_description ?? ""} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} /></div>
              <div><Label>الكلمات المفتاحية</Label><Input value={form.meta_keywords ?? ""} onChange={(e) => setForm({ ...form, meta_keywords: e.target.value })} placeholder="كلمة1, كلمة2" /></div>
            </div>
            <div><Label>صورة الغلاف</Label><Input value={form.cover_image ?? ""} onChange={(e) => setForm({ ...form, cover_image: e.target.value })} dir="ltr" /></div>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center gap-2"><Switch checked={form.show_in_nav} onCheckedChange={(v) => setForm({ ...form, show_in_nav: v })} /><span className="text-xs">في القائمة</span></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} /><span className="text-xs">منشور</span></div>
              <div><Label className="text-xs">الترتيب</Label><Input type="number" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={save}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PageRow({ p, onEdit, onDelete, onAddChild }: { p: { title: string; slug: string; is_published: boolean; show_in_nav: boolean }; onEdit: () => void; onDelete: () => void; onAddChild: (() => void) | null }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="font-bold flex items-center gap-2 flex-wrap">
          {p.title}
          <span className="text-[10px] text-muted-foreground" dir="ltr">/{p.slug}</span>
          {!p.is_published && <span className="text-[10px] bg-muted px-1.5 rounded-full">مخفي</span>}
          {!p.show_in_nav && <span className="text-[10px] bg-muted px-1.5 rounded-full">خارج القائمة</span>}
        </div>
      </div>
      {onAddChild && <Button size="sm" variant="ghost" onClick={onAddChild}><Plus className="h-3 w-3" /></Button>}
      <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="h-3 w-3" /></Button>
      <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-3 w-3 text-destructive" /></Button>
    </div>
  );
}
