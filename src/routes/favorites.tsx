import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import OrnamentalDivider from "@/components/OrnamentalDivider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, PlayCircle, Heart } from "lucide-react";

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "مفضّلتي — هِمَّتي لِأمّتي" }] }),
  component: FavoritesPage,
});

interface ArtFav { article_slug: string; created_at: string; title?: string }
interface LessonFav { lesson_id: string; created_at: string; lesson?: { slug: string; title: string; thumbnail: string | null } }

function FavoritesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [arts, setArts] = useState<ArtFav[]>([]);
  const [lessons, setLessons] = useState<LessonFav[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: a } = await supabase
        .from("article_favorites")
        .select("article_slug, created_at")
        .order("created_at", { ascending: false });
      // fetch titles
      const slugs = (a ?? []).map((r) => r.article_slug);
      let titles: Record<string, string> = {};
      if (slugs.length) {
        const { data: arts } = await supabase
          .from("articles")
          .select("slug,title")
          .in("slug", slugs);
        titles = Object.fromEntries((arts ?? []).map((r) => [r.slug, r.title]));
      }
      setArts((a ?? []).map((r) => ({ ...r, title: titles[r.article_slug] })));

      const { data: l } = await supabase
        .from("lesson_favorites")
        .select("lesson_id, created_at, lessons(slug,title,thumbnail)")
        .order("created_at", { ascending: false });
      setLessons(
        (l ?? []).map((r: any) => ({
          lesson_id: r.lesson_id,
          created_at: r.created_at,
          lesson: r.lessons,
        })),
      );
    })();
  }, [user]);

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-6">
        <Heart className="h-10 w-10 mx-auto text-[var(--gold)]" />
        <h1 className="font-display text-4xl mt-2">مفضّلتي</h1>
        <OrnamentalDivider />
      </div>
      <Tabs defaultValue="articles">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="articles">المقالات</TabsTrigger>
          <TabsTrigger value="lessons">الدروس</TabsTrigger>
        </TabsList>
        <TabsContent value="articles">
          {arts.length === 0 ? (
            <Empty icon={<BookOpen className="h-10 w-10" />} text="لا مقالات في مفضّلتك بعد" />
          ) : (
            <div className="space-y-2">
              {arts.map((a) => (
                <Link
                  key={a.article_slug}
                  to="/articles/$slug"
                  params={{ slug: a.article_slug }}
                  className="card-elegant rounded-xl p-4 flex items-center gap-3 hover:shadow-[var(--shadow-gold)]"
                >
                  <BookOpen className="h-5 w-5 text-[var(--gold)]" />
                  <span className="flex-1 font-medium">{a.title ?? a.article_slug}</span>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="lessons">
          {lessons.length === 0 ? (
            <Empty icon={<PlayCircle className="h-10 w-10" />} text="لا دروس في مفضّلتك بعد" />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {lessons.map((l) =>
                l.lesson ? (
                  <Link
                    key={l.lesson_id}
                    to="/lessons/$slug"
                    params={{ slug: l.lesson.slug }}
                    className="card-elegant rounded-xl overflow-hidden"
                  >
                    {l.lesson.thumbnail && (
                      <img src={l.lesson.thumbnail} alt={l.lesson.title} className="w-full h-32 object-cover" />
                    )}
                    <div className="p-3 font-medium">{l.lesson.title}</div>
                  </Link>
                ) : null,
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <div className="mx-auto mb-2 opacity-50">{icon}</div>
      <p>{text}</p>
    </div>
  );
}
