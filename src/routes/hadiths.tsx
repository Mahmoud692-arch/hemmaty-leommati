import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { allHadiths as hadiths } from "@/data/hadiths";
import OrnamentalDivider from "@/components/OrnamentalDivider";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/hadiths")({
  head: () => ({
    meta: [
      { title: "الأربعون النووية — هِمَّتي لِأمّتي" },
      {
        name: "description",
        content: "أحاديث الأربعين النووية كاملةً، مع شرحٍ مبسّط وفوائد عملية.",
      },
      { property: "og:title", content: "الأربعون النووية" },
      {
        property: "og:description",
        content: "أحاديث الأربعين النووية كاملةً، مع شرحٍ مبسّط وفوائد عملية.",
      },
    ],
  }),
  component: HadithsPage,
});

function HadithsPage() {
  const { location } = useRouterState();

  if (location.pathname !== "/hadiths") {
    return <Outlet />;
  }

  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl md:text-5xl mb-3">الأربعون النووية</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          جوامعُ كَلِم النبي ﷺ كما جمعها الإمام النووي رحمه الله، مع شرحٍ ميسّر للشباب.
        </p>
        <div className="inline-flex items-center gap-2 mt-4 text-xs px-3 py-1.5 rounded-full bg-[var(--gold)]/15 text-[var(--gold-foreground)] dark:text-[var(--gold)]">
          <ShieldCheck className="h-3.5 w-3.5" /> أحاديثُ صحيحةٌ ومُراجَعَة من مصادرها
        </div>
        <OrnamentalDivider />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
        {hadiths.map((h) => (
          <Link
            key={h.number}
            to="/hadiths/$number"
            params={{ number: String(h.number) }}
            className="card-elegant rounded-2xl p-5 group"
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-11 h-11 rounded-full bg-[var(--gradient-gold)] flex items-center justify-center text-[var(--gold-foreground)] font-bold shadow-[var(--shadow-gold)]">
                {h.number}
              </div>
              <div className="flex-1">
                <h2 className="font-display text-lg group-hover:text-primary transition-colors">
                  {h.title}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">{h.source}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
