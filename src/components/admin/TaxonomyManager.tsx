import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import { toast } from "sonner";

interface Tax {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}
interface Item {
  id: string;
  taxonomy_id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  order_index: number;
}

export default function TaxonomyManager() {
  const [taxs, setTaxs] = useState<Tax[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tax | null>(null);
  const [form, setForm] = useState({ slug: "", name: "", description: "" });
  const [activeTax, setActiveTax] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({ slug: "", name: "", order_index: 0 });
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [itemOpen, setItemOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: i }] = await Promise.all([
      supabase.from("taxonomies").select("*").order("name"),
      supabase.from("taxonomy_items").select("*").order("order_index"),
    ]);
    setTaxs((t ?? []) as Tax[]);
    setItems((i ?? []) as Item[]);
    if (!activeTax && (t ?? []).length > 0) setActiveTax(t![0].id);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const openNew = () => { setEditing(null); setForm({ slug: "", name: "", description: "" }); setOpen(true); };
  const openEdit = (t: Tax) => { setEditing(t); setForm({ slug: t.slug, name: t.name, description: t.description ?? "" }); setOpen(true); };

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim()) { toast.error("الاسم والمعرّف مطلوبان"); return; }
    const payload = { ...form, ...(editing ? { id: editing.id } : {}) };
    const { error } = await supabase.rpc("admin_upsert_taxonomy", { _payload: payload as never });
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحفظ"); setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف التصنيف وكل عناصره؟")) return;
    await supabase.from("taxonomy_items").delete().eq("taxonomy_id", id);
    const { error } = await supabase.from("taxonomies").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف"); load();
  };

  const openNewItem = () => { setEditingItem(null); setItemForm({ slug: "", name: "", order_index: 0 }); setItemOpen(true); };
  const openEditItem = (i: Item) => { setEditingItem(i); setItemForm({ slug: i.slug, name: i.name, order_index: i.order_index }); setItemOpen(true); };

  const saveItem = async () => {
    if (!activeTax || !itemForm.name.trim() || !itemForm.slug.trim()) { toast.error("الاسم والمعرّف مطلوبان"); return; }
    if (editingItem) {
      const { error } = await supabase.from("taxonomy_items").update(itemForm).eq("id", editingItem.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("taxonomy_items").insert({ ...itemForm, taxonomy_id: activeTax });
      if (error) { toast.error(error.message); return; }
    }
    toast.success("تم الحفظ"); setItemOpen(false); load();
  };

  const removeItem = async (id: string) => {
    if (!confirm("حذف العنصر؟")) return;
    await supabase.from("taxonomy_items").delete().eq("id", id);
    load();
  };

  const taxItems = items.filter((i) => i.taxonomy_id === activeTax);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold flex items-center gap-2"><Tags className="h-4 w-4 text-[var(--gold)]" /> التصنيفات والوسوم</h2>
        <Button onClick={openNew}><Plus className="h-3 w-3 ms-1" /> تصنيف جديد</Button>
      </div>

      {loading ? <p className="text-muted-foreground">جارٍ التحميل…</p> : (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <h3 className="text-sm font-bold">التصنيفات</h3>
            {taxs.length === 0 ? <p className="text-xs text-muted-foreground">لا تصنيفات بعد.</p> :
              taxs.map((t) => (
                <div key={t.id} className={`rounded-xl border p-2 cursor-pointer ${activeTax === t.id ? "bg-accent" : ""}`} onClick={() => setActiveTax(t.id)}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm">{t.name}</div>
                      <div className="text-[10px] text-muted-foreground" dir="ltr">{t.slug}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(t); }}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); remove(t.id); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                </div>
              ))
            }
          </div>

          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">العناصر</h3>
              {activeTax && <Button size="sm" onClick={openNewItem}><Plus className="h-3 w-3 ms-1" /> عنصر</Button>}
            </div>
            {!activeTax ? <p className="text-xs text-muted-foreground">اختر تصنيفًا.</p> :
              taxItems.length === 0 ? <p className="text-xs text-muted-foreground">لا عناصر.</p> :
              taxItems.map((i) => (
                <div key={i.id} className="rounded-xl border p-2 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{i.name}</div>
                    <div className="text-[10px] text-muted-foreground" dir="ltr">{i.slug} · #{i.order_index}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openEditItem(i)}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => removeItem(i.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              ))
            }
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "تعديل تصنيف" : "تصنيف جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>الاسم *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>المعرّف *</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} dir="ltr" /></div>
            <div><Label>الوصف</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={save}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={itemOpen} onOpenChange={setItemOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingItem ? "تعديل عنصر" : "عنصر جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>الاسم *</Label><Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} /></div>
            <div><Label>المعرّف *</Label><Input value={itemForm.slug} onChange={(e) => setItemForm({ ...itemForm, slug: e.target.value })} dir="ltr" /></div>
            <div><Label>الترتيب</Label><Input type="number" value={itemForm.order_index} onChange={(e) => setItemForm({ ...itemForm, order_index: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter><Button onClick={saveItem}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
