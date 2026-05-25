import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { allHadiths as staticHadiths, type Hadith } from "@/data/hadiths";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import OrnamentalDivider from "@/components/OrnamentalDivider";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Heart, Sparkles, BookOpen, Lightbulb, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/hadiths/$collection/$number")({
  loader: async ({ params }) => {
    const num = Number(params.number);
    const collection = params.collection;

    // Search in DB
    const { data: dbRow } = await supabase
      .from("hadiths")
      .select("*")
      .eq("collection", collection)
      .eq("number", num)
      .eq("is_published", true)
      .maybeSingle();

    if (dbRow) {
      const hadith: Hadith = {
        number: dbRow.number,
        title: dbRow.source ?? (collection === "bukhari" ? "صحيح البخاري" : collection === "muslim" ? "صحيح مسلم" : "الأربعون النووية"),
        arabic: dbRow.arabic_text,
        narrator: dbRow.narrator ?? "",
        source: dbRow.source ?? "",
        explanation: dbRow.explanation ?? "",
        vocabulary: [],
        benefits: dbRow.benefit ? [dbRow.benefit] : [],
        practical: dbRow.benefit ?? "",
      };
      return { hadith, collection };
    }

    // If nawawi and not in DB, fallback to staticHadiths
    if (collection === "nawawi") {
      const hadith = staticHadiths.find((h) => h.number === num);
      if (!hadith) throw notFound();
      return { hadith, collection };
    }

    throw notFound();
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          {
            title: `الحديث ${loaderData.hadith.number} — ${
              loaderData.collection === "bukhari"
                ? "صحيح البخاري"
                : loaderData.collection === "muslim"
                  ? "صحيح مسلم"
                  : "الأربعون النووية"
            } — هِمَّتي لِأمّتي`,
          },
          { name: "description", content: loaderData.hadith.explanation.slice(0, 160) },
          { property: "og:title", content: loaderData.hadith.title },
          { property: "og:description", content: loaderData.hadith.explanation.slice(0, 160) },
        ]
      : [],
  }),
  notFoundComponent: () => (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="font-display text-3xl mb-4">الحديث غير موجود</h1>
      <Link to="/hadiths" className="text-primary hover:underline">
        العودة إلى بوابة الأحاديث
      </Link>
    </div>
  ),
  component: HadithPage,
});

async function getActionPointValue(key: string) {
  const { data } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();
  const value = Number(data?.value);
  return Number.isFinite(value) ? value : 5;
}

function HadithPage() {
  const { hadith, collection } = Route.useLoaderData();
  const { user, refreshProfile } = useAuth();
  const [isFav, setIsFav] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [navLoading, setNavLoading] = useState(true);

  // Check next/prev existence within the collection
  useEffect(() => {
    const checkNav = async () => {
      setNavLoading(true);
      const prevNum = hadith.number - 1;
      const nextNum = hadith.number + 1;

      if (collection === "nawawi") {
        setHasPrev(prevNum >= 1);
        setHasNext(nextNum <= 42);
        setNavLoading(false);
        return;
      }

      // Check DB for Bukhari/Muslim
      const [prevRes, nextRes] = await Promise.all([
        supabase.from("hadiths").select("id").eq("collection", collection).eq("number", prevNum).eq("is_published", true).maybeSingle(),
        supabase.from("hadiths").select("id").eq("collection", collection).eq("number", nextNum).eq("is_published", true).maybeSingle()
      ]);

      setHasPrev(!!prevRes.data);
      setHasNext(!!nextRes.data);
      setNavLoading(false);
    };

    checkNav();
  }, [hadith.number, collection]);

  // Record read
  useEffect(() => {
    if (!user) return;
    const run = async () => {
      const points = await getActionPointValue("points_hadith_read");
      const { data: existing } = await supabase
        .from("hadith_reads")
        .select("id")
        .eq("user_id", user.id)
        .eq("hadith_collection", collection)
        .eq("hadith_number", hadith.number)
        .maybeSingle();

      if (existing) return;

      await supabase
        .from("hadith_reads")
        .insert({
          user_id: user.id,
          hadith_collection: collection,
          hadith_number: hadith.number
        });

      const { data: prof } = await supabase
        .from("profiles")
        .select("hadiths_read, total_points")
        .eq("user_id", user.id)
        .single();

      if (prof) {
        await supabase
          .from("profiles")
          .update({
            hadiths_read: (prof.hadiths_read ?? 0) + 1,
            total_points: (prof.total_points ?? 0) + points,
          })
          .eq("user_id", user.id);
        toast.success(`+${points} نقاط لقرائتك للحديث 🎉`);
        refreshProfile();
      }
    };
    const t = setTimeout(run, 3000);
    return () => clearTimeout(t);
  }, [user, hadith.number, collection, refreshProfile]);

  // Load favorite state
  useEffect(() => {
    if (!user) return;
    supabase
      .from("hadith_favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("hadith_collection", collection)
      .eq("hadith_number", hadith.number)
      .maybeSingle()
      .then(({ data }) => setIsFav(!!data));
  }, [user, hadith.number, collection]);

  const toggleFav = async () => {
    if (!user) {
      toast.info("سجّل دخولك لإضافة المفضّلة");
      return;
    }
    if (isFav) {
      await supabase
        .from("hadith_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("hadith_collection", collection)
        .eq("hadith_number", hadith.number);
      setIsFav(false);
      toast.message("أُزيل من المفضّلة");
    } else {
      await supabase
        .from("hadith_favorites")
        .insert({
          user_id: user.id,
          hadith_collection: collection,
          hadith_number: hadith.number
        });
      setIsFav(true);
      toast.success("أُضيف إلى المفضّلة 💚");
    }
  };

  const getCollectionName = () => {
    if (collection === "bukhari") return "صحيح البخاري";
    if (collection === "muslim") return "صحيح مسلم";
    return "الأربعون النووية";
  };

  return (
    <article className="container mx-auto px-4 py-12 max-w-3xl">
      <Link
        to={collection === "bukhari" ? "/hadiths/bukhari" : collection === "muslim" ? "/hadiths/muslim" : "/hadiths/nawawi"}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-6"
      >
        <ArrowRight className="h-4 w-4" /> العودة لقائمة {getCollectionName()}
      </Link>

      <header className="text-center mb-8">
        <div className="w-16 h-16 mx-auto rounded-full bg-[var(--gradient-gold)] flex items-center justify-center text-[var(--gold-foreground)] font-bold text-2xl shadow-[var(--shadow-gold)] mb-4 font-display">
          {hadith.number}
        </div>
        <h1 className="font-display text-2xl md:text-3xl mb-2">{hadith.title}</h1>
        <p className="text-sm text-muted-foreground">
          {hadith.narrator} • {hadith.source || getCollectionName()}
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant={isFav ? "default" : "outline"} size="sm" onClick={toggleFav}>
            <Heart className={`h-4 w-4 ms-2 ${isFav ? "fill-current" : ""}`} />
            {isFav ? "في المفضّلة" : "أضف للمفضّلة"}
          </Button>
        </div>
      </header>

      <OrnamentalDivider />

      <section className="card-elegant rounded-2xl p-6 md:p-8 my-8 relative overflow-hidden">
        <div className="absolute inset-0 arabic-pattern opacity-20" />
        <p className="quran-text text-foreground relative z-10 text-center leading-loose text-lg md:text-xl">
          {hadith.arabic}
        </p>
      </section>

      <section className="my-8">
        <h2 className="font-display text-xl flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-[var(--gold)]" /> الشرح والبيان
        </h2>
        <p className="text-foreground/90 leading-loose text-base md:text-lg">
          {hadith.explanation}
        </p>
      </section>

      {hadith.vocabulary && hadith.vocabulary.length > 0 && (
        <section className="my-8 card-elegant rounded-2xl p-6">
          <h2 className="font-display text-xl flex items-center gap-2 mb-3">
            <BookOpen className="h-5 w-5 text-[var(--gold)]" /> معاني الكلمات
          </h2>
          <ul className="space-y-2">
            {hadith.vocabulary.map((v: { word: string; meaning: string }) => (
              <li key={v.word} className="flex flex-wrap gap-2 text-sm">
                <span className="font-bold text-primary">{v.word}:</span>
                <span className="text-muted-foreground">{v.meaning}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hadith.benefits && hadith.benefits.length > 0 && (
        <section className="my-8">
          <h2 className="font-display text-xl flex items-center gap-2 mb-3">
            <Lightbulb className="h-5 w-5 text-[var(--gold)]" /> الفوائد واللطائف المستخلصة
          </h2>
          <ul className="space-y-2.5">
            {hadith.benefits.map((b: string, i: number) => (
              <li key={i} className="flex gap-2 text-foreground/90 leading-relaxed text-sm md:text-base">
                <span className="text-[var(--gold)] font-bold">{i + 1}.</span> {b}
              </li>
            ))}
          </ul>
        </section>
      )}

      {hadith.practical && (
        <section className="my-8 card-elegant rounded-2xl p-6 bg-primary/5 border-e-4 border-[var(--gold)]">
          <h2 className="font-display text-xl mb-2">تطبيقٌ عملي</h2>
          <p className="text-foreground/90 leading-loose text-sm md:text-base">{hadith.practical}</p>
        </section>
      )}

      <OrnamentalDivider />

      <nav className="flex items-center justify-between gap-4 mt-8">
        {navLoading ? (
          <div className="w-full flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--gold)]" />
          </div>
        ) : (
          <>
            {hasPrev ? (
              <Link
                to="/hadiths/$collection/$number"
                params={{ collection, number: String(hadith.number - 1) }}
              >
                <Button variant="outline" size="sm">
                  <ArrowRight className="h-4 w-4 ms-1" /> الحديث السابق
                </Button>
              </Link>
            ) : (
              <div />
            )}
            {hasNext ? (
              <Link
                to="/hadiths/$collection/$number"
                params={{ collection, number: String(hadith.number + 1) }}
              >
                <Button variant="outline" size="sm">
                  الحديث التالي <ArrowLeft className="h-4 w-4 me-1" />
                </Button>
              </Link>
            ) : (
              <div />
            )}
          </>
        )}
      </nav>
    </article>
  );
}
