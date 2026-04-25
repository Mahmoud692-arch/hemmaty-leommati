import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

interface LogRow {
  id: string;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export default function AuditLogViewer() {
  const [items, setItems] = useState<LogRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
      setItems((data ?? []) as LogRow[]);
      setLoading(false);
    })();
  }, []);

  const filtered = items.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.action.toLowerCase().includes(s) ||
      r.entity_type.toLowerCase().includes(s) ||
      (r.actor_email ?? "").toLowerCase().includes(s) ||
      (r.entity_id ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="font-display text-2xl">سجل العمليات</h2>
        <Input placeholder="بحث…" className="max-w-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">جارٍ التحميل…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground rounded-xl border border-dashed">لا سجلات</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-lg border p-3 text-sm flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">{r.action}</span>
              <span className="font-mono text-xs">{r.entity_type}</span>
              {r.entity_id && <span className="text-xs text-muted-foreground">#{r.entity_id.slice(0, 8)}</span>}
              <span className="flex-1" />
              <span className="text-xs text-muted-foreground">{r.actor_email ?? "—"}</span>
              <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("ar-EG")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
