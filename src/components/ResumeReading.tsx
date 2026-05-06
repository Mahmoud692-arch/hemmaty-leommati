import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { History } from "lucide-react";

interface VisitRow {
  entity_type: string;
  entity_id: string;
  title: string | null;
  visited_at: string;
  scroll_percent: number | null;
}

export default function ResumeReading() {
  const { user } = useAuth();
  const [items, setItems] = useState<VisitRow[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("last_visits")
        .select("entity_type, entity_id, title, visited_at, scroll_percent")
        .eq("user_id", user.id)
        .in("entity_type", ["article", "lesson"])
        .order("visited_at", { ascending: false })
        .limit(3);
      if (!cancelled) setItems((data ?? []) as VisitRow[]);
    })();
  }, [user]);

  if (!user || items.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-10">
      <div className="flex items-center gap-2 mb-4">
        <History className="h-5 w-5 text-[var(--gold)]" />
        <h2 className="font-display text-2xl">تابع من حيث توقّفت</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {items.map((it) => {
          const href =
            it.entity_type === "article"
              ? `/articles/${it.entity_id}`
              : `/lessons/${it.entity_id}`;
          return (
            <Link
              key={`${it.entity_type}-${it.entity_id}`}
              to={href as never}
              className="card-elegant rounded-2xl p-5 group block"
            >
              <div className="text-xs text-muted-foreground mb-1">
                {it.entity_type === "article" ? "مقال" : "درس"}
              </div>
              <h3 className="font-display text-lg group-hover:text-primary transition-colors line-clamp-2">
                {it.title ?? "متابعة"}
              </h3>
              {it.scroll_percent != null && it.scroll_percent > 0 && (
                <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--gradient-gold)]"
                    style={{ width: `${Math.min(100, it.scroll_percent)}%` }}
                  />
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
