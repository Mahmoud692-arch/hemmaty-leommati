import { useEffect, useState } from "react";
import { getRandomQuote, type Quote } from "@/data/quotes";
import { Sparkles } from "lucide-react";

export default function QuoteCard() {
  const [q, setQ] = useState<Quote | null>(null);

  useEffect(() => {
    setQ(getRandomQuote());
  }, []);

  if (!q) return null;

  return (
    <div className="card-elegant rounded-2xl p-8 text-center relative overflow-hidden">
      <div className="absolute inset-0 arabic-pattern opacity-30 pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center justify-center gap-2 text-[var(--gold)] mb-4">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-semibold tracking-widest uppercase">
            {q.type === "ayah" ? "آيـة" : q.type === "hadith" ? "حديــث" : "حِكمــة"}
          </span>
          <Sparkles className="h-4 w-4" />
        </div>
        <p
          className={
            q.type === "ayah"
              ? "quran-text font-[var(--font-quran)] text-foreground"
              : "text-2xl font-[var(--font-display)] text-foreground leading-loose"
          }
        >
          {q.text}
        </p>
        <div className="ornamental-divider my-6 max-w-xs mx-auto" />
        <p className="text-sm text-muted-foreground">{q.source}</p>
      </div>
    </div>
  );
}
