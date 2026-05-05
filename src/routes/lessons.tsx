import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import OrnamentalDivider from "@/components/OrnamentalDivider";
import { PlayCircle } from "lucide-react";

export const Route = createFileRoute("/lessons")({
  head: () => ({
    meta: [
      { title: "الدروس والمحاضرات — هِمَّتي لِأمّتي" },
      { name: "description", content: "دروس ومحاضرات مرئية مختارة بعناية لطالب العلم." },
      { property: "og:title", content: "الدروس والمحاضرات — هِمَّتي لِأمّتي" },
      { property: "og:description", content: "دروس ومحاضرات مرئية مختارة بعناية لطالب العلم." },
    ],
  }),
  component: LessonsPage,
});

interface Lesson {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  cover_image: string | null;
  category: string | null;
  instructor: string | null;
  duration_seconds: number | null;
}

function fmt(sec: number | null) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function LessonsPage() {
  const [items, setItems] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("lessons")
        .select("id,slug,title,description,thumbnail,cover_image,category,instructor,duration_seconds")
        .eq("status", "published")
        .order("is_featured", { ascending: false })
        .order("order_index");
      setItems(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="font-display text-4xl md:text-5xl gold-text">الدروس والمحاضرات</h1>
        <p className="text-muted-foreground mt-2">مكتبة فيديو لطالب العلم والإيمان</p>
        <OrnamentalDivider />
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-20">جارٍ التحميل…</div>
      ) : items.length === 0 ? (
        <div className="text-center text-muted-foreground py-20">لم تُنشر دروس بعد.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((l) => {
            const img = l.thumbnail ?? l.cover_image;
            return (
              <Link
                key={l.id}
                to="/lessons/$slug"
                params={{ slug: l.slug }}
                className="card-elegant rounded-2xl overflow-hidden hover:shadow-[var(--shadow-gold)] transition-all"
              >
                <div className="relative">
                  {img ? (
                    <img src={img} alt={l.title} className="w-full h-44 object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-44 bg-[var(--gradient-gold)]/20 flex items-center justify-center">
                      <PlayCircle className="h-12 w-12 text-[var(--gold)]" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                    <PlayCircle className="h-14 w-14 text-white" />
                  </div>
                  {l.duration_seconds && (
                    <span className="absolute bottom-2 left-2 text-xs px-2 py-0.5 rounded bg-black/70 text-white">
                      {fmt(l.duration_seconds)}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  {l.category && <div className="text-xs text-[var(--gold)] mb-1">{l.category}</div>}
                  <h2 className="font-display text-lg mb-1">{l.title}</h2>
                  {l.instructor && (
                    <div className="text-xs text-muted-foreground mb-2">{l.instructor}</div>
                  )}
                  {l.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{l.description}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
