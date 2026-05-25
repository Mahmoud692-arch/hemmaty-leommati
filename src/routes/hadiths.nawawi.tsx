import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { allHadiths } from "@/data/hadiths";
import OrnamentalDivider from "@/components/OrnamentalDivider";
import { Search, BookOpen, ArrowRight, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/hadiths/nawawi")({
  head: () => ({
    meta: [
      { title: "الأربعون النووية — هِمَّتي لِأمّتي" },
      {
        name: "description",
        content: "أحاديث الأربعين النووية كاملةً، مع شرحٍ مبسّط وفوائد عملية.",
      },
    ],
  }),
  component: NawawiHadithsPage,
});

function NawawiHadithsPage() {
  const [search, setSearch] = useState("");

  const filtered = allHadiths.filter(
    (h) =>
      String(h.number).includes(search) ||
      h.title.includes(search) ||
      h.arabic.includes(search)
  );

  return (
    <div className="container mx-auto px-4 py-12 md:py-16 max-w-5xl">
      <div className="mb-6">
        <Link
          to="/hadiths"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowRight className="h-4 w-4" /> العودة لبوابة الأحاديث
        </Link>
      </div>

      <div className="text-center mb-10">
        <div className="w-16 h-16 mx-auto rounded-full bg-[var(--gradient-gold)] flex items-center justify-center text-[var(--gold-foreground)] font-bold text-2xl shadow-[var(--shadow-gold)] mb-4 font-display">
          ٤٢
        </div>
        <h1 className="font-display text-4xl md:text-5xl mb-3">الأربعون النووية</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          جوامعُ كَلِم النبي ﷺ كما جمعها الإمام النووي رحمه الله، مع شرحٍ ميسّر وفوائد عملية للشباب.
        </p>
        <div className="inline-flex items-center gap-2 mt-4 text-xs px-3 py-1.5 rounded-full bg-[var(--gold)]/15 text-[var(--gold-foreground)] dark:text-[var(--gold)]">
          <ShieldCheck className="h-3.5 w-3.5" /> أحاديثُ صحيحةٌ ومُراجَعَة وشرح كامل
        </div>
        <OrnamentalDivider />
      </div>

      <div className="relative max-w-md mx-auto mb-10">
        <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث برقم الحديث أو جزء من النص..."
          className="pe-9 text-right"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          لا توجد أحاديث مطابقة لبحثك.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((h) => (
            <Link
              key={h.number}
              to="/hadiths/$collection/$number"
              params={{ collection: "nawawi", number: String(h.number) }}
              className="card-elegant rounded-2xl p-5 group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--gradient-gold)] flex items-center justify-center text-[var(--gold-foreground)] font-bold shadow-[var(--shadow-gold)] font-display">
                    {h.number}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground font-medium">
                    الأربعون النووية
                  </span>
                </div>
                <h2 className="font-display text-lg group-hover:text-primary transition-colors line-clamp-1 mb-2">
                  {h.title}
                </h2>
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-4">
                  {h.arabic.replace(/«/g, "").replace(/»/g, "")}
                </p>
              </div>
              <div className="text-xs text-[var(--gold)] font-semibold flex items-center gap-1 group-hover:underline justify-end mt-auto">
                عرض الشرح والتفاصيل <BookOpen className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
