import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, Save } from "lucide-react";

interface Lesson {
  id?: string;
  slug: string;
  title: string;
  description: string;
  cover_image: string;
  source_type: "youtube" | "upload";
  youtube_url: string;
  video_url: string;
  thumbnail: string;
  category: string;
  series: string;
  instructor: string;
  duration_seconds: number | null;
  status: "draft" | "published";
  is_featured: boolean;
  order_index: number;
}

const empty: Lesson = {
  slug: "", title: "", description: "", cover_image: "",
  source_type: "youtube", youtube_url: "", video_url: "",
  thumbnail: "", category: "", series: "", instructor: "",
  duration_seconds: null, status: "draft", is_featured: false, order_index: 0,
};

export default function LessonsManager() {
  const [items, setItems] = useState<Lesson[]>([]);
  const [editing, setEditing] = useState<Lesson>(empty);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("lessons").select("*").order("order_index");
    setItems((data ?? []) as Lesson[]);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.slug || !editing.title) { toast.error("الرابط والعنوان مطلوبان"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("admin_upsert_lesson", { _payload: editing as any });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحفظ");
    setEditing(empty);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("حذف الدرس؟")) return;
    const { error } = await supabase.rpc("admin_delete_lesson", { _id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("حُذف");
    load();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card-elegant rounded-2xl p-5 space-y-3">
        <h3 className="font-display text-lg">{editing.id ? "تعديل درس" : "درس جديد"}</h3>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>الرابط (slug)</Label><Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
          <div><Label>المحاضِر</Label><Input value={editing.instructor} onChange={(e) => setEditing({ ...editing, instructor: e.target.value })} /></div>
        </div>
        <div><Label>العنوان</Label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
        <div><Label>الوصف</Label><Textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>التصنيف</Label><Input value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></div>
          <div><Label>السلسلة</Label><Input value={editing.series} onChange={(e) => setEditing({ ...editing, series: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>المصدر</Label>
            <Select value={editing.source_type} onValueChange={(v: "youtube" | "upload") => setEditing({ ...editing, source_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">يوتيوب</SelectItem>
                <SelectItem value="upload">رفع ملف</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>المدة (ثانية)</Label><Input type="number" value={editing.duration_seconds ?? ""} onChange={(e) => setEditing({ ...editing, duration_seconds: e.target.value ? Number(e.target.value) : null })} /></div>
        </div>
        {editing.source_type === "youtube" ? (
          <div><Label>رابط يوتيوب</Label><Input value={editing.youtube_url} onChange={(e) => setEditing({ ...editing, youtube_url: e.target.value })} /></div>
        ) : (
          <div><Label>رابط الفيديو</Label><Input value={editing.video_url} onChange={(e) => setEditing({ ...editing, video_url: e.target.value })} /></div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div><Label>صورة مصغّرة</Label><Input value={editing.thumbnail} onChange={(e) => setEditing({ ...editing, thumbnail: e.target.value })} /></div>
          <div><Label>غلاف</Label><Input value={editing.cover_image} onChange={(e) => setEditing({ ...editing, cover_image: e.target.value })} /></div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2"><Switch checked={editing.status === "published"} onCheckedChange={(v) => setEditing({ ...editing, status: v ? "published" : "draft" })} /><span className="text-sm">منشور</span></div>
            <div className="flex items-center gap-2"><Switch checked={editing.is_featured} onCheckedChange={(v) => setEditing({ ...editing, is_featured: v })} /><span className="text-sm">مميّز</span></div>
          </div>
          <div className="flex items-center gap-2"><Label className="text-xs">ترتيب</Label><Input type="number" className="w-20" value={editing.order_index} onChange={(e) => setEditing({ ...editing, order_index: Number(e.target.value) })} /></div>
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={busy}><Save className="h-4 w-4 ms-1" /> حفظ</Button>
          {editing.id && <Button variant="outline" onClick={() => setEditing(empty)}><Plus className="h-4 w-4 ms-1" /> جديد</Button>}
        </div>
      </div>

      <div className="card-elegant rounded-2xl p-5">
        <h3 className="font-display text-lg mb-3">قائمة الدروس</h3>
        <div className="space-y-2 max-h-[700px] overflow-auto">
          {items.length === 0 && <p className="text-sm text-muted-foreground">لا توجد دروس بعد.</p>}
          {items.map((l) => (
            <div key={l.id} className="border rounded-lg p-3 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{l.title}</div>
                <div className="text-xs text-muted-foreground">{l.source_type} · {l.status}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setEditing(l)}>تعديل</Button>
              <Button size="sm" variant="ghost" onClick={() => del(l.id!)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
