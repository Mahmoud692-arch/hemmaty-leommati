import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import OrnamentalDivider from "@/components/OrnamentalDivider";
import { Search, BookOpen, ArrowRight, ShieldCheck, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 15;

export const Route = createFileRoute("/hadiths/bukhari")({
  head: () => ({
    meta: [
      { title: "صحيح البخاري — هِمَّتي لِأمّتي" },
      {
        name: "description",
        content: "أحاديث من صحيح البخاري، أصح كتاب بعد كتاب الله تعالى، مع رواة الأحاديث وشرحها.",
      },
    ],
  }),
  component: BukhariHadithsPage,
});

interface HadithRow {
  number: number;
  arabic_text: string;
  narrator: string | null;
  source: string | null;
}

function BukhariHadithsPage() {
  const [hadiths, setHadiths] = useState<HadithRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1); // reset to first page on search
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    const fetchHadiths = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("hadiths")
          .select("number, arabic_text, narrator, source", { count: "exact" })
          .eq("collection", "bukhari")
          .eq("is_published", true);

        if (debouncedSearch.trim()) {
          const s = `%${debouncedSearch.trim()}%`;
          // search in arabic text or narrator or number
          if (Number.isFinite(Number(debouncedSearch.trim()))) {
            query = query.eq("number", Number(debouncedSearch.trim()));
          } else {
            query = query.or(`arabic_text.ilike.${s},narrator.ilike.${s}`);
          }
        }

        const start = (currentPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;

        const { data, count, error } = await query
          .order("number", { ascending: true })
          .range(start, end);

        if (error) throw error;
        setHadiths(data ?? []);
        setTotalCount(count ?? 0);
      } catch (err) {
        console.error("Error fetching Bukhari hadiths:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHadiths();
  }, [currentPage, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

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
        <h1 className="font-display text-4xl md:text-5xl mb-3">صحيح الإمام البخاري</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          تصفح أحاديث صحيح البخاري، أصحّ الكتب المصنفة في الحديث النبوي الشريف، مرتبة وبشرح ميسر.
        </p>
        <div className="inline-flex items-center gap-2 mt-4 text-xs px-3 py-1.5 rounded-full bg-[var(--gold)]/15 text-[var(--gold-foreground)] dark:text-[var(--gold)]">
          <ShieldCheck className="h-3.5 w-3.5" /> أحاديثُ مسندة ومراجعة من أمّ المجموعات
        </div>
        <OrnamentalDivider />
      </div>

      <div className="relative max-w-md mx-auto mb-10">
        <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث برقم الحديث، الراوي أو جزء من النص..."
          className="pe-9 text-right"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--gold)] mb-2" />
          جاري تحميل الأحاديث...
        </div>
      ) : hadiths.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          لا توجد أحاديث مطابقة لبحثك في صحيح البخاري.
          <p className="text-xs mt-2">تأكد من استيراد الأحاديث من لوحة الإدارة أولاً.</p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {hadiths.map((h) => (
              <Link
                key={h.number}
                to="/hadiths/$collection/$number"
                params={{ collection: "bukhari", number: String(h.number) }}
                className="card-elegant rounded-2xl p-5 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--gold)]/15 text-[var(--gold)] flex items-center justify-center font-bold font-display">
                      {h.number}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 font-medium">
                      صحيح البخاري
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-primary mb-1 line-clamp-1">{h.narrator}</p>
                  <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed mb-4 font-normal quran-text">
                    {h.arabic_text}
                  </p>
                </div>
                <div className="text-xs text-[var(--gold)] font-semibold flex items-center gap-1 group-hover:underline justify-end mt-auto">
                  عرض الشرح والتفاصيل <BookOpen className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronRight className="h-4 w-4 ml-1" /> السابق
              </Button>
              <span className="text-sm text-muted-foreground px-3">
                صفحة {currentPage} من {totalPages} (إجمالي {totalCount} حديث)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                التالي <ChevronLeft className="h-4 w-4 mr-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
