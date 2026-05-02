import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

interface Rule {
  id: string;
  name: string;
  trigger_event: string;
  conditions: Record<string, unknown>;
  actions: unknown;
  is_active: boolean;
}

const empty = { name: "", trigger_event: "user_signup", is_active: true };
const sampleActions = `[
  { "type": "notify", "title": "أهلًا بك!", "message": "نسعد بانضمامك" },
  { "type": "award_points", "delta": 10 }
]`;

export default function AutomationManager() {
  const [items, setItems] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [form, setForm] = useState(empty);
  const [conditionsText, setConditionsText] = useState("{}");
  const [actionsText, setActionsText] = useState(sampleActions);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("automation_rules").select("*").order("created_at", { ascending: false });
    setItems(((data ?? []) as unknown) as Rule[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null); setForm(empty); setConditionsText("{}"); setActionsText(sampleActions); setOpen(true);
  };
  const openEdit = (r: Rule) => {
    setEditing(r);
    setForm({ name: r.name, trigger_event: r.trigger_event, is_active: r.is_active });
    setConditionsText(JSON.stringify(r.conditions ?? {}, null, 2));
    setActionsText(JSON.stringify(r.actions ?? [], null, 2));
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.trigger_event.trim()) { toast.error("الاسم والحدث مطلوبان"); return; }
    let conditions: unknown, actions: unknown;
    try { conditions = JSON.parse(conditionsText || "{}"); } catch { toast.error("Conditions ليس JSON"); return; }
    try { actions = JSON.parse(actionsText || "[]"); } catch { toast.error("Actions ليس JSON"); return; }
    const payload = { ...form, conditions, actions, ...(editing ? { id: editing.id } : {}) };
    const { error } = await supabase.rpc("admin_upsert_automation", { _payload: payload as never });
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحفظ"); setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف القاعدة؟")) return;
    const { error } = await supabase.from("automation_rules").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف"); load();
  };

  const toggle = async (r: Rule) => {
    await supabase.from("automation_rules").update({ is_active: !r.is_active }).eq("id", r.id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold flex items-center gap-2"><Zap className="h-4 w-4 text-[var(--gold)]" /> قواعد الأتمتة</h2>
        <Button onClick={openNew}><Plus className="h-3 w-3 ml-1" /> قاعدة جديدة</Button>
      </div>

      {loading ? <p className="text-muted-foreground">جارٍ التحميل…</p> : items.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-6 text-center">لا قواعد بعد.</p>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div key={r.id} className="card-elegant rounded-xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-bold flex items-center gap-2">
                  {r.name}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted" dir="ltr">{r.trigger_event}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${r.is_active ? "bg-emerald-500/15 text-emerald-700" : "bg-muted"}`}>
                    {r.is_active ? "نشط" : "متوقف"}
                  </span>
                </div>
              </div>
              <Switch checked={r.is_active} onCheckedChange={() => toggle(r)} />
              <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "تعديل قاعدة" : "قاعدة أتمتة جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>الاسم *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>الحدث المُحفّز</Label>
              <select value={form.trigger_event} onChange={(e) => setForm({ ...form, trigger_event: e.target.value })} className="w-full h-9 rounded-md border bg-background px-2 text-sm">
                <option value="user_signup">تسجيل مستخدم جديد</option>
                <option value="article_published">نشر مقال</option>
                <option value="quiz_completed">إكمال كويز</option>
                <option value="comment_added">إضافة تعليق</option>
                <option value="points_milestone">بلوغ سقف نقاط</option>
                <option value="level_up">ارتقاء مستوى</option>
              </select>
            </div>
            <div>
              <Label>الشروط (JSON)</Label>
              <Textarea rows={3} className="font-mono text-xs" value={conditionsText} onChange={(e) => setConditionsText(e.target.value)} />
            </div>
            <div>
              <Label>الإجراءات (JSON Array)</Label>
              <Textarea rows={6} className="font-mono text-xs" value={actionsText} onChange={(e) => setActionsText(e.target.value)} />
              <p className="text-[10px] text-muted-foreground mt-1">{`أنواع: notify, award_points, award_badge, send_email`}</p>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><span className="text-sm">نشط</span></div>
          </div>
          <DialogFooter><Button onClick={save}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
