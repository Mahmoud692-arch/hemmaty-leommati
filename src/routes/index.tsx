import { createFileRoute, Link } from "@tanstack/react-router";
import QuoteCard from "@/components/QuoteCard";
import OrnamentalDivider from "@/components/OrnamentalDivider";
import { Button } from "@/components/ui/button";
import { articles } from "@/data/articles";
import { allHadiths as hadiths } from "@/data/hadiths";
import { LEVELS } from "@/lib/journey";
import { BookOpen, Trophy, Heart, ArrowLeft, Star } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "هِمَّتي لِأمّتي — منصةُ الإيمانِ والعمل" },
      {
        name: "description",
        content:
          "ابدأ رحلتك الإيمانية: مقالات عميقة، أربعون النووي كاملة، اقتباسات مُلهمة، ولوحة إنجاز شخصية.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const featured = articles.slice(0, 3);

  return (
    <div className="relative">
      {/* Hero */}
      <section className="hero-gradient text-[var(--cream)] relative overflow-hidden">
        <div className="absolute inset-0 arabic-pattern opacity-20" />
        <div className="container mx-auto px-4 py-20 md:py-28 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-[var(--gold)]/30 text-sm mb-6 backdrop-blur-sm">
            <Star className="h-3.5 w-3.5 text-[var(--gold)]" />
            <span>منصةٌ تربويةٌ موثوقة • مراجَعة شرعيًا</span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl mb-6 leading-tight">
            هِمَّتي <span className="gold-text">لِأمّتي</span>
          </h1>
          <p className="text-lg md:text-xl text-[var(--cream)]/80 max-w-2xl mx-auto leading-relaxed mb-8">
            رحلةٌ إيمانيةٌ تأخذ بيدك من البداية إلى التأثير، عبر مقالات عميقة، وأحاديث صحيحة، ولوحة
            إنجازٍ تُحفّزك على الاستمرار.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/articles">
              <Button
                size="lg"
                className="bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold)]/90 shadow-[var(--shadow-gold)]"
              >
                ابدأ القراءة <ArrowLeft className="h-4 w-4 mr-2" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button
                size="lg"
                variant="outline"
                className="border-[var(--cream)]/30 text-[var(--cream)] hover:bg-white/10"
              >
                أنشئ حسابك
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="container mx-auto px-4 -mt-12 relative z-20">
        <div className="max-w-2xl mx-auto">
          <QuoteCard />
        </div>
      </section>

      {/* Levels */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl mb-3">الرحلةُ الإيمانية</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            أربعةُ مستوياتٍ تأخذ بيدك من بدايات الالتزام إلى مرحلة التأثير في الناس.
          </p>
          <OrnamentalDivider />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {LEVELS.map((lv, idx) => (
            <div key={lv.level} className="card-elegant rounded-2xl p-6 relative">
              <div className="absolute -top-3 right-6 w-10 h-10 rounded-full bg-[var(--gradient-gold)] flex items-center justify-center text-[var(--gold-foreground)] font-bold shadow-[var(--shadow-gold)]">
                {idx + 1}
              </div>
              <div className="pt-4">
                <h3 className="font-display text-xl mb-1">{lv.title}</h3>
                <p className="text-sm text-[var(--gold)] mb-3">{lv.subtitle}</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {lv.themes.map((t) => (
                    <li key={t} className="flex items-center gap-1.5">
                      <span className="text-[var(--gold)]">•</span> {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link to="/journey">
            <Button variant="outline">
              اعرف المزيد عن الرحلة <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Featured Articles */}
      <section className="bg-card/40 border-y border-border py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <h2 className="font-display text-3xl md:text-4xl mb-2">مقالاتٌ مختارة</h2>
              <p className="text-muted-foreground text-sm">محتوًى مُراجعٌ علميًا ودينيًا</p>
            </div>
            <Link to="/articles" className="text-sm text-primary font-semibold hover:underline">
              كل المقالات ←
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {featured.map((a) => (
              <Link
                key={a.slug}
                to="/articles/$slug"
                params={{ slug: a.slug }}
                className="card-elegant rounded-2xl p-6 group block"
              >
                <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--gold)]/15 text-[var(--gold-foreground)] dark:text-[var(--gold)] font-semibold">
                  {a.category}
                </span>
                <h3 className="font-display text-xl mt-4 mb-2 group-hover:text-primary transition-colors">
                  {a.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {a.excerpt}
                </p>
                <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
                  <BookOpen className="h-3 w-3" /> {a.readTime} دقائق قراءة
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Hadith preview */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl mb-3">الأربعون النووية</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {hadiths.length} حديثًا من جوامع كَلِم النبي ﷺ، مع شرحٍ مبسّط وفوائد عملية.
          </p>
          <OrnamentalDivider />
        </div>
        <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {hadiths.slice(0, 4).map((h) => (
            <Link
              key={h.number}
              to="/hadiths/$number"
              params={{ number: String(h.number) }}
              className="card-elegant rounded-2xl p-6 group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[var(--gradient-gold)] flex items-center justify-center text-sm font-bold text-[var(--gold-foreground)]">
                  {h.number}
                </div>
                <h3 className="font-display text-lg group-hover:text-primary transition-colors">
                  {h.title}
                </h3>
              </div>
              <p
                className="text-sm text-muted-foreground line-clamp-2 quran-text"
                style={{ fontSize: "0.95rem", lineHeight: 1.9 }}
              >
                {h.arabic.split("«")[1]?.split("»")[0] ?? h.arabic.slice(0, 120)}...
              </p>
            </Link>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link to="/hadiths">
            <Button variant="outline">
              جميع الأحاديث <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16">
        <div className="card-elegant rounded-3xl p-10 md:p-14 text-center max-w-3xl mx-auto relative overflow-hidden">
          <div className="absolute inset-0 arabic-pattern opacity-30" />
          <div className="relative z-10">
            <Heart className="h-10 w-10 text-[var(--gold)] mx-auto mb-4" />
            <h3 className="font-display text-2xl md:text-3xl mb-3">انضمّ إلى رحلة الهمّة</h3>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              أنشئ حسابك مجانًا، وابدأ في جمع نقاطك وشاراتك، وتدرّج في مستويات الرحلة الإيمانية.
            </p>
            <Link to="/auth">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 shadow-[var(--shadow-elegant)]"
              >
                <Trophy className="h-4 w-4 ml-2" /> ابدأ الآن مجانًا
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
