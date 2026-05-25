import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { allHadiths as staticHadiths } from "@/data/hadiths";
import { articles as staticArticles } from "@/data/articles";
import OrnamentalDivider from "@/components/OrnamentalDivider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, BookOpen, Scroll, FileText, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "البحث الشامل — هِمَّتي لِأمّتي" },
      {
        name: "description",
        content: "محرك البحث الإسلامي الموحد للبحث في القرآن الكريم، الأحاديث النبوية، والمقالات التوعوية.",
      },
    ],
  }),
  component: GlobalSearchPage,
});

interface QuranHit {
  number: number;
  text: string;
  numberInSurah: number;
  surah: {
    number: number;
    name: string;
    englishName: string;
  };
}

interface HadithHit {
  number: number;
  collection: string;
  arabic_text: string;
  narrator: string;
  source: string;
  explanation: string;
}

interface ArticleHit {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  content: string;
}

function GlobalSearchPage() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "quran" | "hadiths" | "articles">("all");
  const [searching, setSearching] = useState(false);

  const [quranHits, setQuranHits] = useState<QuranHit[]>([]);
  const [hadithHits, setHadithHits] = useState<HadithHit[]>([]);
  const [articleHits, setArticleHits] = useState<ArticleHit[]>([]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = query.trim();
    if (!q) {
      toast.error("يرجى كتابة كلمة للبحث");
      return;
    }
    if (q.length < 2) {
      toast.error("يرجى كتابة حرفين على الأقل");
      return;
    }

    setSearching(true);

    try {
      // 1. Search Quran (API)
      const quranPromise = fetch(`https://api.alquran.cloud/v1/search/${encodeURIComponent(q)}/all/quran-uthmani`)
        .then((r) => r.json())
        .then((d) => (d?.data?.matches ?? []).slice(0, 15) as QuranHit[])
        .catch((err) => {
          console.error("Error searching Quran:", err);
          return [] as QuranHit[];
        });

      // 2. Search Hadiths (Supabase + Static)
      const hadithsPromise = (async () => {
        let results: HadithHit[] = [];

        // Static Nawawi hadiths search
        staticHadiths.forEach((h) => {
          if (h.arabic.includes(q) || h.narrator.includes(q) || h.explanation.includes(q) || h.title.includes(q)) {
            results.push({
              number: h.number,
              collection: "nawawi",
              arabic_text: h.arabic,
              narrator: h.narrator,
              source: h.source,
              explanation: h.explanation,
            });
          }
        });

        // Supabase hadiths search
        try {
          const s = `%${q}%`;
          const { data } = await supabase
            .from("hadiths")
            .select("number, collection, arabic_text, narrator, source, explanation")
            .eq("is_published", true)
            .or(`arabic_text.ilike.${s},narrator.ilike.${s},explanation.ilike.${s}`);

          if (data) {
            data.forEach((dbRow) => {
              // Avoid duplicates if already added from static
              if (!results.some((r) => r.collection === dbRow.collection && r.number === dbRow.number)) {
                results.push({
                  number: dbRow.number,
                  collection: dbRow.collection ?? "nawawi",
                  arabic_text: dbRow.arabic_text,
                  narrator: dbRow.narrator ?? "",
                  source: dbRow.source ?? "",
                  explanation: dbRow.explanation ?? "",
                });
              }
            });
          }
        } catch (err) {
          console.error("Error searching Supabase hadiths:", err);
        }

        return results.slice(0, 15);
      })();

      // 3. Search Articles (Supabase + Static)
      const articlesPromise = (async () => {
        let results: ArticleHit[] = [];

        // Static articles search
        staticArticles.forEach((a) => {
          if (a.title.includes(q) || a.excerpt.includes(q) || a.content.includes(q)) {
            results.push({
              slug: a.slug,
              title: a.title,
              excerpt: a.excerpt,
              category: a.category,
              content: a.content,
            });
          }
        });

        // Supabase articles search
        try {
          const { data } = await supabase
            .from("articles")
            .select("slug, title, excerpt, category, content")
            .eq("is_published", true);

          if (data) {
            data.forEach((dbRow) => {
              const matches =
                dbRow.title.includes(q) ||
                (dbRow.excerpt ?? "").includes(q) ||
                dbRow.content.includes(q);

              if (matches && !results.some((r) => r.slug === dbRow.slug)) {
                results.push({
                  slug: dbRow.slug,
                  title: dbRow.title,
                  excerpt: dbRow.excerpt ?? "",
                  category: dbRow.category ?? "",
                  content: dbRow.content,
                });
              }
            });
          }
        } catch (err) {
          console.error("Error searching Supabase articles:", err);
        }

        return results.slice(0, 15);
      })();

      const [quranRes, hadithsRes, articlesRes] = await Promise.all([
        quranPromise,
        hadithsPromise,
        articlesPromise,
      ]);

      setQuranHits(quranRes);
      setHadithHits(hadithsRes);
      setArticleHits(articlesRes);

      if (quranRes.length === 0 && hadithsRes.length === 0 && articlesRes.length === 0) {
        toast.info("لم يتم العثور على أي نتائج");
      } else {
        toast.success("اكتمل البحث بنجاح");
      }
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء تنفيذ البحث");
    } finally {
      setSearching(false);
    }
  };

  const getHadithCollectionName = (col: string) => {
    if (col === "bukhari") return "صحيح البخاري";
    if (col === "muslim") return "صحيح مسلم";
    return "الأربعون النووية";
  };

  const hasHits = quranHits.length > 0 || hadithHits.length > 0 || articleHits.length > 0;

  return (
    <div className="container mx-auto px-4 py-12 md:py-16 max-w-4xl">
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl md:text-5xl mb-3">البحث الشامل في الموقع</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          محرك بحث موحد يبحث في آيات القرآن الكريم، المجموعات الحديثية المطهرة، والمقالات التوعوية والدعوية.
        </p>
        <OrnamentalDivider />
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl mx-auto mb-10">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="اكتب كلمة أو آية أو رقم حديث للبحث..."
          className="text-right flex-1 h-12 text-base rounded-2xl border-border bg-card shadow-sm"
        />
        <Button type="submit" disabled={searching} className="h-12 px-6 rounded-2xl gap-2 font-semibold">
          {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
          ابحث
        </Button>
      </form>

      {hasHits && (
        <Tabs
          value={activeTab}
          onValueChange={(v: any) => setActiveTab(v)}
          className="w-full mb-8 text-center"
        >
          <TabsList className="grid grid-cols-4 max-w-md mx-auto rounded-xl">
            <TabsTrigger value="all">الكل ({quranHits.length + hadithHits.length + articleHits.length})</TabsTrigger>
            <TabsTrigger value="quran">القرآن ({quranHits.length})</TabsTrigger>
            <TabsTrigger value="hadiths">الأحاديث ({hadithHits.length})</TabsTrigger>
            <TabsTrigger value="articles">المقالات ({articleHits.length})</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {searching && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--gold)] mb-3" />
          جاري البحث في مصادر الموقع الإسلامية...
        </div>
      )}

      {!searching && !hasHits && query.trim() && (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-3xl bg-card/40">
          لم نعثر على أي نتائج مطابقة لـ &quot;{query}&quot;. يرجى تجربة كلمات بحث أخرى.
        </div>
      )}

      {!searching && hasHits && (
        <div className="space-y-8">
          {/* 1. Quran hits */}
          {(activeTab === "all" || activeTab === "quran") && quranHits.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-2xl flex items-center gap-2 text-primary border-b pb-2">
                <BookOpen className="h-5 w-5 text-[var(--gold)]" /> نتائج من القرآن الكريم
              </h2>
              <div className="grid gap-4">
                {quranHits.map((hit) => (
                  <div key={hit.number} className="card-elegant rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute inset-0 arabic-pattern opacity-10" />
                    <p className="quran-text text-foreground relative z-10 text-center leading-loose text-lg md:text-xl mb-4">
                      {hit.text}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground relative z-10">
                      <span>سورة {hit.surah.name} - الآية {hit.numberInSurah}</span>
                      <Link
                        to="/quran"
                        className="text-primary font-semibold hover:underline flex items-center gap-1"
                      >
                        عرض في المصحف <ArrowLeft className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Hadith hits */}
          {(activeTab === "all" || activeTab === "hadiths") && hadithHits.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-2xl flex items-center gap-2 text-primary border-b pb-2">
                <Scroll className="h-5 w-5 text-[var(--gold)]" /> نتائج من الأحاديث النبوية
              </h2>
              <div className="grid gap-4">
                {hadithHits.map((hit, idx) => (
                  <div key={idx} className="card-elegant rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--gold)]/10 text-[var(--gold)]">
                            {getHadithCollectionName(hit.collection)}
                          </span>
                          <span className="text-xs text-muted-foreground">الحديث {hit.number}</span>
                        </div>
                      </div>
                      <p className="text-xs text-primary font-semibold mb-1">{hit.narrator}</p>
                      <p className="text-sm line-clamp-3 leading-relaxed mb-4 font-normal quran-text">
                        {hit.arabic_text}
                      </p>
                    </div>
                    <div className="flex justify-end border-t pt-3">
                      <Link
                        to="/hadiths/$collection/$number"
                        params={{ collection: hit.collection, number: String(hit.number) }}
                        className="text-xs text-[var(--gold)] font-semibold flex items-center gap-1 hover:underline"
                      >
                        عرض الشرح والتفاصيل <ArrowLeft className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Article hits */}
          {(activeTab === "all" || activeTab === "articles") && articleHits.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-2xl flex items-center gap-2 text-primary border-b pb-2">
                <FileText className="h-5 w-5 text-[var(--gold)]" /> نتائج من المقالات
              </h2>
              <div className="grid gap-4">
                {articleHits.map((hit) => (
                  <div key={hit.slug} className="card-elegant rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--gold)]/15 text-[var(--gold-foreground)] dark:text-[var(--gold)] font-medium">
                          {hit.category}
                        </span>
                      </div>
                      <h3 className="font-display text-lg mb-2">{hit.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4">
                        {hit.excerpt}
                      </p>
                    </div>
                    <div className="flex justify-end border-t pt-3">
                      <Link
                        to="/articles/$slug"
                        params={{ slug: hit.slug }}
                        className="text-xs text-[var(--gold)] font-semibold flex items-center gap-1 hover:underline"
                      >
                        قراءة المقال كاملاً <ArrowLeft className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
