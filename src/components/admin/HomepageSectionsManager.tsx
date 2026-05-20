import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

interface SectionRow {
  id: string;
  section_type: string;
  title: string | null;
  content: Record<string, unknown>;
  order_index: number;
  is_visible: boolean;
}

const sectionTypes = [
  { value: "hero", label: "Hero / غلاف" },
  { value: "text", label: "نص" },
  { value: "cards", label: "بطاقات" },
  { value: "image", label: "صورة" },
  { value: "buttons", label: "أزرار" },
  { value: "video", label: "فيديو" },
  { value: "quotes", label: "اقتباسات" },
];

export default function HomepageSectionsManager() {
  const [items, setItems] = useState<SectionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("homepage_sections").select("*").order("order_index");
    setItems(((data ?? []) as unknown) as SectionRow[]);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const addNew = async () => {
    const { error } = await supabase.from("homepage_sections").insert({
      section_type: "text",
      title: "قسم جديد",
      content: { body: "" },
      order_index: items.length,
      is_visible: true,
    });
    if (error) return toast.error(error.message);
    load();
  };

  const update = async (s: SectionRow) => {
    const { error } = await supabase.from("homepage_sections").update({
      section_type: s.section_type,
      title: s.title,
      content: s.content as never,
      order_index: s.order_index,
      is_visible: s.is_visible,
    }).eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("حُفظ");
  };

  const remove = async (id: string) => {
    if (!confirm("حذف القسم؟")) return;
    await supabase.from("homepage_sections").delete().eq("id", id);
    load();
  };

  const move = async (s: SectionRow, dir: -1 | 1) => {
    const idx = items.findIndex((x) => x.id === s.id);
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const a = items[idx];
    const b = items[j];
    await supabase.from("homepage_sections").update({ order_index: b.order_index }).eq("id", a.id);
    await supabase.from("homepage_sections").update({ order_index: a.order_index }).eq("id", b.id);
    load();
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">جارٍ التحميل…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl">أقسام الصفحة الرئيسية</h2>
        <Button onClick={addNew}>
          <Plus className="h-4 w-4 ms-1" /> قسم جديد
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground rounded-xl border border-dashed">
          لا أقسام ديناميكية بعد. الصفحة الرئيسية تعرض المحتوى الافتراضي.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((s, idx) => (
            <div key={s.id} className="rounded-xl border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <select
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                  value={s.section_type}
                  onChange={(e) => setItems((p) => p.map((x) => (x.id === s.id ? { ...x, section_type: e.target.value } : x)))}
                >
                  {sectionTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                <span className="flex-1" />
                <Switch checked={s.is_visible} onCheckedChange={(v) => setItems((p) => p.map((x) => (x.id === s.id ? { ...x, is_visible: v } : x)))} />
                <Button size="sm" variant="ghost" onClick={() => move(s, -1)}>
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => move(s, 1)}>
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div>
                <Label>العنوان</Label>
                <Input value={s.title ?? ""} onChange={(e) => setItems((p) => p.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))} />
              </div>
              <div>
                <Label>المحتوى (JSON)</Label>
                <Textarea
                  rows={4}
                  className="font-mono text-xs"
                  value={JSON.stringify(s.content, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setItems((p) => p.map((x) => (x.id === s.id ? { ...x, content: parsed } : x)));
                    } catch {
                      // ignore parse error while typing
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  أمثلة: نص: <code>{`{"body":"..."}`}</code> — بطاقات: <code>{`{"items":[{"title":"","text":""}]}`}</code> — صورة: <code>{`{"src":"...","alt":""}`}</code>
                </p>
              </div>
              <Button size="sm" onClick={() => update(s)}>حفظ القسم</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
