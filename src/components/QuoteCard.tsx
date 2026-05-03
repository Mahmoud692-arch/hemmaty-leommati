import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Shuffle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DbQuote {
  id: string;
  text: string;
  source: string | null;
  type: "ayah" | "hadith" | "wisdom";
}

type FilterType = "all" | "ayah" | "hadith" | "wisdom";

const TYPE_LABEL: Record<DbQuote["type"], string> = {
  ayah: "آيـة",
  hadith: "حديــث",
  wisdom: "حِكمــة",
};

export default function QuoteCard() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [quote, setQuote] = useState<DbQuote | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchQuote = useCallback(async (type: FilterType) => {
    setLoading(true);
    let q = supabase.from("quotes").select("id,text,source,type").eq("is_published", true);
    if (type !== "all") q = q.eq("type", type);
    const { data } = await q.limit(50);
    const list = (data ?? []) as DbQuote[];
    if (list.length === 0) {
      setQuote(null);
    } else {
      setQuote(list[Math.floor(Math.random() * list.length)]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchQuote(filter); }, [filter, fetchQuote]);

  const tabs: { key: FilterType; label: string }[] = [
    { key: "all", label: "الكل" },
    { key: "ayah", label: "آيات" },
    { key: "hadith", label: "أحاديث" },
    { key: "wisdom", label: "حِكم" },
  ];

  return (
    <div className="card-elegant rounded-2xl p-6 md:p-8 text-center relative overflow-hidden">
      <div className="absolute inset-0 arabic-pattern opacity-30 pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center justify-center gap-1 mb-4 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`text-xs px-3 py-1 rounded-full transition ${
                filter === t.key
                  ? "bg-[var(--gold)] text-background font-semibold"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-muted-foreground py-10">جارٍ التحميل…</p>
        ) : quote ? (
          <>
            <div className="flex items-center justify-center gap-2 text-[var(--gold)] mb-4">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold tracking-widest uppercase">
                {TYPE_LABEL[quote.type]}
              </span>
              <Sparkles className="h-4 w-4" />
            </div>
            <p
              className={
                quote.type === "ayah"
                  ? "quran-text font-[var(--font-quran)] text-foreground"
                  : "text-2xl font-[var(--font-display)] text-foreground leading-loose"
              }
            >
              {quote.text}
            </p>
            <div className="ornamental-divider my-6 max-w-xs mx-auto" />
            <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              المصدر: {quote.source ?? "—"}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground py-10">لا توجد اقتباسات بعد</p>
        )}

        <div className="mt-6">
          <Button size="sm" variant="outline" onClick={() => fetchQuote(filter)} disabled={loading}>
            <Shuffle className="h-3.5 w-3.5 ml-1" /> اقتباس آخر
          </Button>
        </div>
      </div>
    </div>
  );
}
