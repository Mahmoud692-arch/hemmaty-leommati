import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Plus, Save } from "lucide-react";

interface Story {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image: string;
  prophet_name: string;
  order_index: number;
  is_published: boolean;
}

const empty: Story = {
  slug: "", title: "", excerpt: "", content: "", cover_image: "",
  prophet_name: "", order_index: 0, is_published: false,
};

export default function StoriesManager() {
  const [items, setItems] = useState<Story[]>([]);
  const [editing, setEditing] = useState<Story>(empty);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("prophet_stories")
      .select("*")
      .order("order_index");
    setItems((data ?? []) as Story[]);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.slug || !editing.title) { toast.error("الرابط والعنوان مطلوبان"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("admin_upsert_prophet_story", {
      _payload: editing as any,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحفظ");
    setEditing(empty);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("حذف القصة؟")) return;
    const { error } = await supabase.rpc("admin_delete_prophet_story", { _id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("حُذفت");
    load();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card-elegant rounded-2xl p-5 space-y-3">
        <h3 className="font-display text-lg">{editing.id ? "تعديل قصة" : "قصة جديدة"}</h3>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>الرابط (slug)</Label><Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
          <div><Label>اسم النبي</Label><Input value={editing.prophet_name} onChange={(e) => setEditing({ ...editing, prophet_name: e.target.value })} /></div>
        </div>
        <div><Label>العنوان</Label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
        <div><Label>المقتطف</Label><Textarea rows={2} value={editing.excerpt} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} /></div>
        <div><Label>صورة الغلاف (رابط)</Label><Input value={editing.cover_image} onChange={(e) => setEditing({ ...editing, cover_image: e.target.value })} /></div>
        <div><Label>المحتوى (Markdown)</Label><Textarea rows={10} value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} /></div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Switch checked={editing.is_published} onCheckedChange={(v) => setEditing({ ...editing, is_published: v })} /><span className="text-sm">منشور</span></div>
          <div className="flex items-center gap-2"><Label className="text-xs">ترتيب</Label><Input type="number" className="w-20" value={editing.order_index} onChange={(e) => setEditing({ ...editing, order_index: Number(e.target.value) })} /></div>
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={busy}><Save className="h-4 w-4 ml-1" /> حفظ</Button>
          {editing.id && <Button variant="outline" onClick={() => setEditing(empty)}><Plus className="h-4 w-4 ml-1" /> جديد</Button>}
        </div>
      </div>

      <div className="card-elegant rounded-2xl p-5">
        <h3 className="font-display text-lg mb-3">قائمة القصص</h3>
        <div className="space-y-2 max-h-[600px] overflow-auto">
          {items.length === 0 && <p className="text-sm text-muted-foreground">لا توجد بعد.</p>}
          {items.map((s) => (
            <div key={s.id} className="border rounded-lg p-3 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{s.title}</div>
                <div className="text-xs text-muted-foreground">{s.prophet_name} · {s.is_published ? "منشور" : "مسودة"}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>تعديل</Button>
              <Button size="sm" variant="ghost" onClick={() => del(s.id!)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
