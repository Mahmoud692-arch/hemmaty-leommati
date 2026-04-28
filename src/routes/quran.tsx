import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import OrnamentalDivider from "@/components/OrnamentalDivider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, Bookmark, Loader2, ChevronLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/quran")({
  head: () => ({
    meta: [
      { title: "القرآن الكريم — هِمَّتي لِأمّتي" },
      { name: "description", content: "تصفّح المصحف الشريف كاملاً، 114 سورة، مع البحث، والتنقّل بين السور والآيات." },
      { property: "og:title", content: "القرآن الكريم — هِمَّتي لِأمّتي" },
      { property: "og:description", content: "تصفّح المصحف الشريف كاملاً مع البحث والتنقّل." },
    ],
  }),
  component: QuranPage,
});

interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

interface Ayah {
  number: number;
  numberInSurah: number;
  text: string;
  juz: number;
  page: number;
}

function QuranPage() {
  const { user } = useAuth();
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAyahs, setLoadingAyahs] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("https://api.alquran.cloud/v1/surah")
      .then((r) => r.json())
      .then((d) => {
        setSurahs(d?.data ?? []);
        setLoading(false);
      })
      .catch(() => {
        toast.error("تعذّر تحميل قائمة السور");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("quran_bookmarks")
      .select("surah_number, ayah_number")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setBookmarks(new Set((data ?? []).map((b) => `${b.surah_number}:${b.ayah_number ?? ""}`)));
      });
  }, [user]);

  const openSurah = async (n: number) => {
    setSelected(n);
    setLoadingAyahs(true);
    setAyahs([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const r = await fetch(`https://api.alquran.cloud/v1/surah/${n}/quran-uthmani`);
      const d = await r.json();
      setAyahs(d?.data?.ayahs ?? []);
    } catch {
      toast.error("تعذّر تحميل السورة");
    }
    setLoadingAyahs(false);
  };

  const toggleBookmark = async (surah: number, ayah: number | null = null) => {
    if (!user) {
      toast.error("سجّل دخولك لحفظ المفضلة");
      return;
    }
    const key = `${surah}:${ayah ?? ""}`;
    if (bookmarks.has(key)) {
      await supabase.from("quran_bookmarks").delete().eq("user_id", user.id).eq("surah_number", surah).eq("ayah_number", ayah);
      const n = new Set(bookmarks);
      n.delete(key);
      setBookmarks(n);
    } else {
      await supabase.from("quran_bookmarks").insert({ user_id: user.id, surah_number: surah, ayah_number: ayah });
      setBookmarks(new Set(bookmarks).add(key));
      toast.success("تمت الإضافة للمفضلة");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return surahs;
    return surahs.filter((s) =>
      s.name.includes(q) ||
      s.englishName.toLowerCase().includes(q.toLowerCase()) ||
      String(s.number).includes(q),
    );
  }, [surahs, search]);

  const currentSurah = surahs.find((s) => s.number === selected);

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <div className="text-center mb-8">
        <BookOpen className="h-12 w-12 mx-auto text-[var(--gold)] mb-3" />
        <h1 className="font-display text-4xl md:text-5xl">القرآن الكريم</h1>
        <p className="text-muted-foreground mt-2 text-sm max-w-xl mx-auto">
          المصحفُ الشريف كاملاً، 114 سورة، تصفّح وبحث وحفظ في المفضلة.
        </p>
        <OrnamentalDivider />
      </div>

      {selected && currentSurah ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setAyahs([]); }}>
              <ChevronLeft className="h-4 w-4 ml-1" /> السور
            </Button>
            <h2 className="font-display text-2xl flex-1 text-center">
              سورة {currentSurah.name}
              <span className="text-xs text-muted-foreground mr-2">({currentSurah.numberOfAyahs} آية · {currentSurah.revelationType === "Meccan" ? "مكية" : "مدنية"})</span>
            </h2>
            <Button variant="outline" size="sm" onClick={() => toggleBookmark(currentSurah.number)}>
              <Bookmark className={`h-4 w-4 ml-1 ${bookmarks.has(`${currentSurah.number}:`) ? "fill-current text-[var(--gold)]" : ""}`} />
              {bookmarks.has(`${currentSurah.number}:`) ? "محفوظة" : "حفظ"}
            </Button>
          </div>

          <div className="card-elegant rounded-2xl p-6 md:p-10">
            {currentSurah.number !== 1 && currentSurah.number !== 9 && (
              <div className="text-center font-display text-2xl text-[var(--gold)] mb-6 quran-text">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </div>
            )}
            {loadingAyahs ? (
              <div className="text-center py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                <p className="text-sm mt-2">جارٍ تحميل الآيات…</p>
              </div>
            ) : (
              <div className="quran-text text-2xl md:text-3xl leading-loose text-right" style={{ lineHeight: 2.4 }}>
                {ayahs.map((a) => {
                  const k = `${currentSurah.number}:${a.numberInSurah}`;
                  const isBm = bookmarks.has(k);
                  return (
                    <span key={a.number} className="inline">
                      {a.text}
                      <button
                        onClick={() => toggleBookmark(currentSurah.number, a.numberInSurah)}
                        className={`inline-flex items-center justify-center w-9 h-9 mx-1 rounded-full text-sm font-bold transition-colors ${isBm ? "bg-[var(--gold)] text-[var(--gold-foreground)]" : "bg-[var(--gold)]/10 text-[var(--gold)] hover:bg-[var(--gold)]/20"}`}
                        title={`الآية ${a.numberInSurah}${isBm ? " — محفوظة" : ""}`}
                      >
                        ﴿{a.numberInSurah}﴾
                      </button>{" "}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="relative max-w-md mx-auto mb-6">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن سورة بالاسم أو الرقم…"
              className="pr-9"
            />
          </div>

          {loading ? (
            <div className="text-center py-20 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              <p className="text-sm mt-2">جارٍ التحميل…</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((s) => (
                <button
                  key={s.number}
                  onClick={() => openSurah(s.number)}
                  className="card-elegant rounded-2xl p-4 text-right hover:border-[var(--gold)]/50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[var(--gradient-gold)] flex items-center justify-center text-[var(--gold-foreground)] font-bold shadow-[var(--shadow-gold)]">
                      {s.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-xl group-hover:text-primary transition-colors">
                        {s.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {s.numberOfAyahs} آية · {s.revelationType === "Meccan" ? "مكية" : "مدنية"}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div className="text-center mt-10 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">العودة للرئيسية</Link>
      </div>
    </div>
  );
}
