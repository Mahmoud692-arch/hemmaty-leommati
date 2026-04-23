import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { useEffect } from "react";
import { articles } from "@/data/articles";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { POINTS } from "@/lib/journey";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, ShieldCheck, Award } from "lucide-react";
import { toast } from "sonner";
import OrnamentalDivider from "@/components/OrnamentalDivider";

export const Route = createFileRoute("/articles/$slug")({
  loader: ({ params }) => {
    const article = articles.find((a) => a.slug === params.slug);
    if (!article) throw notFound();
    return { article };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.article.title} — هِمَّتي لِأمّتي` },
          { name: "description", content: loaderData.article.excerpt },
          { property: "og:title", content: loaderData.article.title },
          { property: "og:description", content: loaderData.article.excerpt },
        ]
      : [],
  }),
  notFoundComponent: () => (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="font-display text-3xl mb-4">المقال غير موجود</h1>
      <Link to="/articles" className="text-primary hover:underline">العودة إلى المقالات</Link>
    </div>
  ),
  component: ArticlePage,
});

function ArticlePage() {
  const { article } = Route.useLoaderData();
  const { user, refreshProfile } = useAuth();

  useEffect(() => {
    if (!user) return;
    const recordRead = async () => {
      // check if already read
      const { data: existing } = await supabase
        .from("article_reads")
        .select("id")
        .eq("user_id", user.id)
        .eq("article_slug", article.slug)
        .maybeSingle();

      if (existing) return;

      const { error } = await supabase
        .from("article_reads")
        .insert({ user_id: user.id, article_slug: article.slug });
      if (error) return;

      // increment profile counters
      const { data: prof } = await supabase
        .from("profiles")
        .select("articles_read, total_points")
        .eq("user_id", user.id)
        .single();

      if (prof) {
        await supabase
          .from("profiles")
          .update({
            articles_read: (prof.articles_read ?? 0) + 1,
            total_points: (prof.total_points ?? 0) + POINTS.ARTICLE_READ,
          })
          .eq("user_id", user.id);
        toast.success(`+${POINTS.ARTICLE_READ} نقاط على قراءة المقال 🎉`);
        refreshProfile();
      }
    };
    // delay to ensure user actually opened it
    const t = setTimeout(recordRead, 4000);
    return () => clearTimeout(t);
  }, [user, article.slug, refreshProfile]);

  return (
    <article className="container mx-auto px-4 py-12 max-w-3xl">
      <Link
        to="/articles"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-8"
      >
        <ArrowRight className="h-4 w-4" /> العودة للمقالات
      </Link>

      <header className="mb-8">
        <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--gold)]/15 text-[var(--gold-foreground)] dark:text-[var(--gold)] font-semibold">
          {article.category}
        </span>
        <h1 className="font-display text-3xl md:text-5xl mt-4 mb-4 leading-tight">
          {article.title}
        </h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> {article.readTime} دقائق قراءة</span>
          <span>{new Date(article.date).toLocaleDateString("ar-EG")}</span>
        </div>
        <div className="inline-flex items-center gap-2 mt-4 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="h-3.5 w-3.5" /> مُراجَعٌ علميًا ودينيًا
        </div>
      </header>

      <OrnamentalDivider />

      <div className="prose prose-lg max-w-none text-foreground
        prose-headings:font-[var(--font-display)] prose-headings:text-foreground
        prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-primary
        prose-p:leading-loose prose-p:text-foreground/90
        prose-strong:text-foreground prose-strong:font-semibold
        prose-ul:my-4 prose-li:my-1
        prose-blockquote:border-r-4 prose-blockquote:border-[var(--gold)] prose-blockquote:pr-4 prose-blockquote:bg-accent/20 prose-blockquote:py-2 prose-blockquote:rounded-r-lg">
        <ReactMarkdown>{article.content}</ReactMarkdown>
      </div>

      <OrnamentalDivider />

      {!user && (
        <div className="card-elegant rounded-2xl p-6 text-center mt-10">
          <Award className="h-8 w-8 text-[var(--gold)] mx-auto mb-3" />
          <h3 className="font-display text-xl mb-2">سجّل قراءتك واكسب نقاطًا</h3>
          <p className="text-sm text-muted-foreground mb-4">
            أنشئ حسابًا مجانيًا لتسجيل تقدّمك في الرحلة الإيمانية.
          </p>
          <Link to="/auth">
            <Button>إنشاء حساب</Button>
          </Link>
        </div>
      )}
    </article>
  );
}
