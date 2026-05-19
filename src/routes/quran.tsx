import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import OrnamentalDivider from "@/components/OrnamentalDivider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, Bookmark, Loader2, ChevronLeft, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/quran")({
  head: () => ({
    meta: [
      { title: "القرآن الكريم — هِمَّتي لِأمّتي" },
      { name: "description", content: "تصفّح المصحف الشريف كاملاً، 114 سورة، مع البحث في النص القرآني والتنقّل بين السور والآيات." },
      { property: "og:title", content: "القرآن الكريم — هِمَّتي لِأمّتي" },
      { property: "og:description", content: "تصفّح المصحف الشريف كاملاً مع البحث في الآيات والتنقّل." },
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

interface SearchHit {
  number: number;
  text: string;
  numberInSurah: number;
  surah: { number: number; name: string; englishName: string };
}

const normalizeArabic = (text: string) =>
  text
    .normalize("NFC")
    .replace(/\p{M}/gu, "")
    .replace(/[ٱإأآ]/gu, "ا")
    .replace(/ـ/gu, "")
    .replace(/\s+/g, "");

const BASMALA_PREFIX = normalizeArabic("بسم الله الرحمن الرحيم");

function QuranPage() {
  const { user } = useAuth();
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [search, setSearch] = useState("");
  const [searchMode, setSearchMode] = useState<"surah" | "ayah">("surah");
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAyahs, setLoadingAyahs] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [highlightAyah, setHighlightAyah] = useState<number | null>(null);

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

  const openSurah = async (n: number, focusAyah: number | null = null) => {
    setSelected(n);
    setLoadingAyahs(true);
    setAyahs([]);
    setHighlightAyah(focusAyah);
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const r = await fetch(`https://api.alquran.cloud/v1/surah/${n}/quran-uthmani`);
      const d = await r.json();
      setAyahs(d?.data?.ayahs ?? []);
    } catch {
      toast.error("تعذّر تحميل السورة");
    }
    setLoadingAyahs(false);
    if (focusAyah) {
      setTimeout(() => {
        const el = document.getElementById(`ayah-${focusAyah}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }
  };

  const toggleBookmark = async (surah: number, ayah: number | null = null) => {
    if (!user) {
      toast.error("سجّل دخولك لحفظ المفضلة");
      return;
    }
    const key = `${surah}:${ayah ?? ""}`;
    if (bookmarks.has(key)) {
      const q = supabase.from("quran_bookmarks").delete().eq("user_id", user.id).eq("surah_number", surah);
      await (ayah == null ? q.is("ayah_number", null) : q.eq("ayah_number", ayah));
      const n = new Set(bookmarks);
      n.delete(key);
      setBookmarks(n);
    } else {
      await supabase.from("quran_bookmarks").insert({ user_id: user.id, surah_number: surah, ayah_number: ayah });
      setBookmarks(new Set(bookmarks).add(key));
      toast.success("تمت الإضافة للمفضلة");
    }
  };

  const runAyahSearch = async () => {
    const q = search.trim();
    if (q.length < 2) {
      toast.error("اكتب حرفين على الأقل للبحث في الآيات");
      return;
    }
    setSearching(true);
    setSearchHits([]);
    try {
      const r = await fetch(`https://api.alquran.cloud/v1/search/${encodeURIComponent(q)}/all/quran-uthmani`);
      const d = await r.json();
      const matches = d?.data?.matches ?? [];
      setSearchHits(matches.slice(0, 50));
      if (!matches.length) toast("لا توجد نتائج لهذا البحث");
    } catch {
      toast.error("تعذّر البحث في الآيات");
    }
    setSearching(false);
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

  const isBasmala = (text: string) =>
    normalizeArabic(text).startsWith(BASMALA_PREFIX);

  const removeBasmalaPrefix = (text: string) => {
    const trimmed = text.replace(/^\s+/u, "");
    if (!normalizeArabic(trimmed).startsWith(BASMALA_PREFIX)) return text;

    let accumulated = "";
    let index = 0;

    while (index < trimmed.length && accumulated.length < BASMALA_PREFIX.length) {
      const char = trimmed[index];
      const normalizedChar = normalizeArabic(char);
      if (normalizedChar) {
        accumulated += normalizedChar;
        if (!BASMALA_PREFIX.startsWith(accumulated)) break;
      }
      index += 1;
    }

    return accumulated === BASMALA_PREFIX ? trimmed.slice(index).trimStart() : text;
  };

  // Keep the crafted Basmala header, but strip the duplicate Basmala prefix from
  // the first ayah when the API returns it inside ayah 1.
  const renderedAyahs = useMemo(() => {
    if (!currentSurah || !ayahs.length) return ayahs;
    if (currentSurah.number === 1 || currentSurah.number === 9) return ayahs;
    const first = ayahs[0];
    if (!first || first.numberInSurah !== 1 || !isBasmala(first.text)) return ayahs;

    const trimmedText = removeBasmalaPrefix(first.text);
    if (!trimmedText) return ayahs.slice(1);

    return [{ ...first, text: trimmedText }, ...ayahs.slice(1)];
  }, [currentSurah, ayahs]);

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <div className="text-center mb-8">
        <BookOpen className="h-12 w-12 mx-auto text-[var(--gold)] mb-3" />
        <h1 className="font-display text-4xl md:text-5xl">القرآن الكريم</h1>
        <p className="text-muted-foreground mt-2 text-sm max-w-xl mx-auto">
          المصحفُ الشريف كاملاً، 114 سورة، تصفّح وبحث في الآيات وحفظ في المفضلة.
        </p>
        <OrnamentalDivider />
      </div>

      {selected && currentSurah ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setAyahs([]); setHighlightAyah(null); }}>
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
                {renderedAyahs.map((a) => {
                  const k = `${currentSurah.number}:${a.numberInSurah}`;
                  const isBm = bookmarks.has(k);
                  const isHi = highlightAyah === a.numberInSurah;
                  return (
                    <span key={a.number} id={`ayah-${a.numberInSurah}`} className={`inline ${isHi ? "bg-[var(--gold)]/20 rounded-md px-1" : ""}`}>
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
          <div className="max-w-2xl mx-auto mb-6 space-y-3">
            <div className="flex gap-2 justify-center">
              <Button
                size="sm"
                variant={searchMode === "surah" ? "default" : "outline"}
                onClick={() => { setSearchMode("surah"); setSearchHits([]); }}
              >
                بحث في السور
              </Button>
              <Button
                size="sm"
                variant={searchMode === "ayah" ? "default" : "outline"}
                onClick={() => { setSearchMode("ayah"); }}
              >
                بحث في الآيات
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && searchMode === "ayah") runAyahSearch(); }}
                placeholder={searchMode === "surah" ? "ابحث عن سورة بالاسم أو الرقم…" : "ابحث في نص الآيات (مثلاً: الرحمن، الصبر)…"}
                className="pr-9 pl-9"
              />
              {search && (
                <button onClick={() => { setSearch(""); setSearchHits([]); }} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {searchMode === "ayah" && (
              <div className="text-center">
                <Button size="sm" onClick={runAyahSearch} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Search className="h-4 w-4 ml-1" />}
                  ابحث في الآيات
                </Button>
              </div>
            )}
          </div>

          {searchMode === "ayah" && searchHits.length > 0 && (
            <div className="mb-8 space-y-2">
              <div className="text-sm text-muted-foreground text-center">
                {searchHits.length} نتيجة
              </div>
              {searchHits.map((hit) => (
                <button
                  key={hit.number}
                  onClick={() => openSurah(hit.surah.number, hit.numberInSurah)}
                  className="w-full text-right card-elegant rounded-xl p-4 hover:border-[var(--gold)]/50 transition-all"
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    سورة {hit.surah.name} · الآية {hit.numberInSurah}
                  </div>
                  <div className="quran-text text-lg leading-loose">{hit.text}</div>
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="text-center py-20 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              <p className="text-sm mt-2">جارٍ التحميل…</p>
            </div>
          ) : searchMode === "surah" || !searchHits.length ? (
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
          ) : null}
        </>
      )}

      <div className="text-center mt-10 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">العودة للرئيسية</Link>
      </div>
    </div>
  );
}
