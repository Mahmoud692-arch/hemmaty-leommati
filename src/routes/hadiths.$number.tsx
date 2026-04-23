import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { allHadiths as hadiths } from "@/data/hadiths";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { POINTS } from "@/lib/journey";
import OrnamentalDivider from "@/components/OrnamentalDivider";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Heart, Sparkles, BookOpen, Lightbulb } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/hadiths/$number")({
  loader: ({ params }) => {
    const num = Number(params.number);
    const hadith = hadiths.find((h) => h.number === num);
    if (!hadith) throw notFound();
    return { hadith };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `الحديث ${loaderData.hadith.number}: ${loaderData.hadith.title} — هِمَّتي لِأمّتي` },
          { name: "description", content: loaderData.hadith.explanation.slice(0, 160) },
          { property: "og:title", content: loaderData.hadith.title },
          { property: "og:description", content: loaderData.hadith.explanation.slice(0, 160) },
        ]
      : [],
  }),
  notFoundComponent: () => (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="font-display text-3xl mb-4">الحديث غير موجود</h1>
      <Link to="/hadiths" className="text-primary hover:underline">العودة إلى الأحاديث</Link>
    </div>
  ),
  component: HadithPage,
});

function HadithPage() {
  const { hadith } = Route.useLoaderData();
  const { user, refreshProfile } = useAuth();
  const [isFav, setIsFav] = useState(false);

  // record read
  useEffect(() => {
    if (!user) return;
    const run = async () => {
      const { data: existing } = await supabase
        .from("hadith_reads")
        .select("id")
        .eq("user_id", user.id)
        .eq("hadith_number", hadith.number)
        .maybeSingle();
      if (existing) return;

      await supabase.from("hadith_reads").insert({ user_id: user.id, hadith_number: hadith.number });

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
            total_points: (prof.total_points ?? 0) + POINTS.HADITH_READ,
          })
          .eq("user_id", user.id);
        toast.success(`+${POINTS.HADITH_READ} نقاط 🎉`);
        refreshProfile();
      }
    };
    const t = setTimeout(run, 3000);
    return () => clearTimeout(t);
  }, [user, hadith.number, refreshProfile]);

  // load favorite state
  useEffect(() => {
    if (!user) return;
    supabase
      .from("hadith_favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("hadith_number", hadith.number)
      .maybeSingle()
      .then(({ data }) => setIsFav(!!data));
  }, [user, hadith.number]);

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
        .eq("hadith_number", hadith.number);
      setIsFav(false);
      toast.message("أُزيل من المفضّلة");
    } else {
      await supabase.from("hadith_favorites").insert({ user_id: user.id, hadith_number: hadith.number });
      setIsFav(true);
      toast.success("أُضيف إلى المفضّلة 💚");
    }
  };

  const prev = hadiths.find((h) => h.number === hadith.number - 1);
  const next = hadiths.find((h) => h.number === hadith.number + 1);

  return (
    <article className="container mx-auto px-4 py-12 max-w-3xl">
      <Link to="/hadiths" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowRight className="h-4 w-4" /> كل الأحاديث
      </Link>

      <header className="text-center mb-8">
        <div className="w-16 h-16 mx-auto rounded-full bg-[var(--gradient-gold)] flex items-center justify-center text-[var(--gold-foreground)] font-bold text-2xl shadow-[var(--shadow-gold)] mb-4">
          {hadith.number}
        </div>
        <h1 className="font-display text-3xl md:text-4xl mb-2">{hadith.title}</h1>
        <p className="text-sm text-muted-foreground">{hadith.narrator} • {hadith.source}</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant={isFav ? "default" : "outline"} size="sm" onClick={toggleFav}>
            <Heart className={`h-4 w-4 ml-2 ${isFav ? "fill-current" : ""}`} />
            {isFav ? "في المفضّلة" : "أضف للمفضّلة"}
          </Button>
        </div>
      </header>

      <OrnamentalDivider />

      <section className="card-elegant rounded-2xl p-6 md:p-8 my-8 relative overflow-hidden">
        <div className="absolute inset-0 arabic-pattern opacity-20" />
        <p className="quran-text text-foreground relative z-10 text-center">{hadith.arabic}</p>
      </section>

      <section className="my-8">
        <h2 className="font-display text-xl flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-[var(--gold)]" /> الشرح
        </h2>
        <p className="text-foreground/90 leading-loose">{hadith.explanation}</p>
      </section>

      {hadith.vocabulary.length > 0 && (
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

      {hadith.benefits.length > 0 && (
        <section className="my-8">
          <h2 className="font-display text-xl flex items-center gap-2 mb-3">
            <Lightbulb className="h-5 w-5 text-[var(--gold)]" /> الفوائد
          </h2>
          <ul className="space-y-2">
            {hadith.benefits.map((b: string, i: number) => (
              <li key={i} className="flex gap-2 text-foreground/90">
                <span className="text-[var(--gold)] font-bold">{i + 1}.</span> {b}
              </li>
            ))}
          </ul>
        </section>
      )}

      {hadith.practical && (
        <section className="my-8 card-elegant rounded-2xl p-6 bg-primary/5 border-r-4 border-[var(--gold)]">
          <h2 className="font-display text-xl mb-2">تطبيقٌ عملي</h2>
          <p className="text-foreground/90 leading-loose">{hadith.practical}</p>
        </section>
      )}

      <OrnamentalDivider />

      <nav className="flex items-center justify-between gap-4 mt-8">
        {prev ? (
          <Link to="/hadiths/$number" params={{ number: String(prev.number) }}>
            <Button variant="outline" size="sm"><ArrowRight className="h-4 w-4 ml-1" /> الحديث {prev.number}</Button>
          </Link>
        ) : <div />}
        {next ? (
          <Link to="/hadiths/$number" params={{ number: String(next.number) }}>
            <Button variant="outline" size="sm">الحديث {next.number} <ArrowLeft className="h-4 w-4 mr-1" /></Button>
          </Link>
        ) : <div />}
      </nav>
    </article>
  );
}
