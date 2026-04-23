import { createFileRoute, Link } from "@tanstack/react-router";
import { LEVELS } from "@/lib/journey";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import OrnamentalDivider from "@/components/OrnamentalDivider";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "الرحلة الإيمانية — هِمَّتي لِأمّتي" },
      { name: "description", content: "أربعة مستويات تأخذك من البداية إلى التأثير في الأمة." },
      { property: "og:title", content: "الرحلة الإيمانية" },
      {
        property: "og:description",
        content: "أربعة مستويات تأخذك من البداية إلى التأثير في الأمة.",
      },
    ],
  }),
  component: JourneyPage,
});

function JourneyPage() {
  const { user } = useAuth();
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center">
        <Trophy className="h-12 w-12 mx-auto text-[var(--gold)] mb-3" />
        <h1 className="font-display text-4xl md:text-5xl mb-3">الرحلة الإيمانية</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          منهجٌ مُتدرّج مكوّن من أربعة مستويات: تتدرّج فيها بالقراءة والتفاعل، تكسب نقاطًا وشارات،
          وتسير من بداية الالتزام إلى التأثير.
        </p>
        <OrnamentalDivider />
      </div>

      <div className="space-y-8 my-10">
        {LEVELS.map((lv, idx) => (
          <div key={lv.level} className="flex items-start gap-4">
            <div className="shrink-0 w-14 h-14 rounded-full bg-[var(--gradient-gold)] flex items-center justify-center text-[var(--gold-foreground)] font-bold text-xl shadow-[var(--shadow-gold)]">
              {idx + 1}
            </div>
            <div className="card-elegant rounded-2xl p-6 flex-1">
              <h2 className="font-display text-2xl mb-1">{lv.title}</h2>
              <p className="text-[var(--gold)] text-sm mb-3">{lv.subtitle}</p>
              <p className="text-sm text-muted-foreground mb-3">يبدأ من {lv.minPoints} نقطة</p>
              <ul className="space-y-1.5 text-foreground/90">
                {lv.themes.map((t) => (
                  <li key={t} className="flex items-center gap-2 text-sm">
                    <span className="text-[var(--gold)]">✦</span> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-10">
        {user ? (
          <Link to="/dashboard">
            <Button size="lg">شاهد لوحة إنجازك</Button>
          </Link>
        ) : (
          <Link to="/auth">
            <Button size="lg">ابدأ رحلتك الآن</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
