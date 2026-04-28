import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, Plus, Minus, History, Trophy } from "lucide-react";
import { toast } from "sonner";

interface ProfileLite {
  user_id: string;
  full_name: string;
  email: string;
  total_points: number;
  level: number;
}

interface Adjustment {
  id: string;
  user_id: string;
  delta: number;
  reason: string;
  notification_message: string | null;
  created_at: string;
}

export default function PointsManager() {
  const [users, setUsers] = useState<ProfileLite[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ProfileLite | null>(null);
  const [delta, setDelta] = useState<number>(10);
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState("");
  const [history, setHistory] = useState<Adjustment[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, total_points, level")
      .order("total_points", { ascending: false });
    setUsers((data ?? []) as ProfileLite[]);
  };

  const loadHistory = async () => {
    const { data } = await supabase
      .from("points_adjustments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setHistory((data ?? []) as Adjustment[]);
  };

  useEffect(() => { load(); loadHistory(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users.slice(0, 50);
    return users.filter((u) => u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  }, [users, search]);

  const submit = async (sign: 1 | -1) => {
    if (!selected) return;
    if (!reason.trim()) {
      toast.error("اكتب سبب التعديل");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("admin_adjust_points", {
      _user_id: selected.user_id,
      _delta: Math.abs(delta) * sign,
      _reason: reason.trim(),
      _notify: notify.trim() || undefined,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(sign > 0 ? "تمت الإضافة" : "تم الخصم");
    setReason(""); setNotify("");
    load(); loadHistory();
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border p-4 bg-gradient-to-br from-[var(--gold)]/5 to-primary/5">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-5 w-5 text-[var(--gold)]" />
          <h3 className="font-bold">إدارة نقاط المستخدمين</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          أضف أو اخصم نقاطًا من أي مستخدم مع سبب مكتوب وإشعار اختياري له.
        </p>

        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن مستخدم بالاسم أو البريد…" className="pr-9" />
        </div>

        <div className="max-h-48 overflow-y-auto rounded-lg border bg-background">
          {filtered.map((u) => (
            <button
              key={u.user_id}
              onClick={() => setSelected(u)}
              className={`w-full text-right px-3 py-2 border-b last:border-b-0 text-sm flex justify-between items-center hover:bg-accent/50 ${selected?.user_id === u.user_id ? "bg-accent" : ""}`}
            >
              <div>
                <div className="font-medium">{u.full_name}</div>
                <div className="text-[10px] text-muted-foreground" dir="ltr">{u.email}</div>
              </div>
              <div className="text-xs font-bold text-primary">{u.total_points} نقطة · م{u.level}</div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="mt-4 p-3 rounded-lg border bg-background space-y-3">
            <div className="text-sm">
              المختار: <span className="font-bold">{selected.full_name}</span>
              <span className="text-xs text-muted-foreground mr-2">({selected.total_points} نقطة)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">عدد النقاط</Label>
                <Input type="number" min={1} value={delta} onChange={(e) => setDelta(Number(e.target.value) || 0)} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">السبب *</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثل: مشاركة فعّالة" />
              </div>
            </div>
            <div>
              <Label className="text-xs">رسالة إشعار للمستخدم (اختيارية)</Label>
              <Textarea rows={2} value={notify} onChange={(e) => setNotify(e.target.value)} placeholder="اكتب رسالة الإشعار يدويًا…" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => submit(1)} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-3 w-3 ml-1" /> إضافة {delta} نقطة
              </Button>
              <Button onClick={() => submit(-1)} disabled={submitting} variant="destructive">
                <Minus className="h-3 w-3 ml-1" /> خصم {delta} نقطة
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border p-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">سجل آخر التعديلات</h3>
        </div>
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا تعديلات بعد.</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {history.map((h) => {
              const u = users.find((u) => u.user_id === h.user_id);
              return (
                <div key={h.id} className="text-xs border-b pb-1.5 flex justify-between gap-2">
                  <div>
                    <span className={`font-bold ${h.delta >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {h.delta >= 0 ? "+" : ""}{h.delta}
                    </span>
                    <span className="mx-1">→</span>
                    <span>{u?.full_name ?? "—"}</span>
                    <span className="text-muted-foreground"> · {h.reason}</span>
                  </div>
                  <span className="text-muted-foreground text-[10px] shrink-0">
                    {new Date(h.created_at).toLocaleString("ar-EG")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
