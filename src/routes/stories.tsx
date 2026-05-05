import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import OrnamentalDivider from "@/components/OrnamentalDivider";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/stories")({
  head: () => ({
    meta: [
      { title: "قصص الأنبياء — هِمَّتي لِأمّتي" },
      { name: "description", content: "قصص الأنبياء والمرسلين بأسلوب موثوق ومبسّط." },
      { property: "og:title", content: "قصص الأنبياء — هِمَّتي لِأمّتي" },
      { property: "og:description", content: "قصص الأنبياء والمرسلين بأسلوب موثوق ومبسّط." },
    ],
  }),
  component: StoriesPage,
});

interface Story {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  prophet_name: string | null;
}

function StoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("prophet_stories")
        .select("id,slug,title,excerpt,cover_image,prophet_name")
        .eq("is_published", true)
        .order("order_index");
      setStories(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="font-display text-4xl md:text-5xl gold-text">قصص الأنبياء</h1>
        <p className="text-muted-foreground mt-2">عِبَرٌ ودروس من حياة المرسلين عليهم الصلاة والسلام</p>
        <OrnamentalDivider />
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-20">جارٍ التحميل…</div>
      ) : stories.length === 0 ? (
        <div className="text-center text-muted-foreground py-20">
          لم تُنشر قصص بعد. تابعنا قريبًا بإذن الله.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((s) => (
            <Link
              key={s.id}
              to="/stories/$slug"
              params={{ slug: s.slug }}
              className="card-elegant rounded-2xl overflow-hidden hover:shadow-[var(--shadow-gold)] transition-all"
            >
              {s.cover_image ? (
                <img src={s.cover_image} alt={s.title} className="w-full h-44 object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-44 bg-[var(--gradient-gold)]/20 flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-[var(--gold)]" />
                </div>
              )}
              <div className="p-5">
                {s.prophet_name && (
                  <div className="text-xs text-[var(--gold)] mb-1">{s.prophet_name}</div>
                )}
                <h2 className="font-display text-xl mb-2">{s.title}</h2>
                {s.excerpt && <p className="text-sm text-muted-foreground line-clamp-3">{s.excerpt}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
