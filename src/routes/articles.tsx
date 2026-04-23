import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { articles } from "@/data/articles";
import OrnamentalDivider from "@/components/OrnamentalDivider";
import { BookOpen, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/articles")({
  head: () => ({
    meta: [
      { title: "المقالات — هِمَّتي لِأمّتي" },
      { name: "description", content: "مقالاتٌ تربويةٌ عميقة مُراجَعة شرعيًا وعلميًا قبل النشر." },
      { property: "og:title", content: "المقالات — هِمَّتي لِأمّتي" },
      {
        property: "og:description",
        content: "مقالاتٌ تربويةٌ عميقة مُراجَعة شرعيًا وعلميًا قبل النشر.",
      },
    ],
  }),
  component: ArticlesPage,
});

function ArticlesPage() {
  const { location } = useRouterState();

  if (location.pathname !== "/articles") {
    return <Outlet />;
  }

  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl md:text-5xl mb-3">المقالات</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          مقالاتٌ مُفصّلةٌ وعميقة تجمع بين الدليل الشرعي والتطبيق العملي في حياة الشباب.
        </p>
        <div className="inline-flex items-center gap-2 mt-4 text-xs px-3 py-1.5 rounded-full bg-[var(--gold)]/15 text-[var(--gold-foreground)] dark:text-[var(--gold)]">
          <ShieldCheck className="h-3.5 w-3.5" /> مُراجعةٌ علميةٌ ودينيةٌ قبل النشر
        </div>
        <OrnamentalDivider />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {articles.map((a) => (
          <Link
            key={a.slug}
            to="/articles/$slug"
            params={{ slug: a.slug }}
            className="card-elegant rounded-2xl p-6 group flex flex-col"
          >
            <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--gold)]/15 text-[var(--gold-foreground)] dark:text-[var(--gold)] font-semibold w-fit">
              {a.category}
            </span>
            <h2 className="font-display text-xl mt-4 mb-2 group-hover:text-primary transition-colors">
              {a.title}
            </h2>
            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed flex-1">
              {a.excerpt}
            </p>
            <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3 w-3" /> {a.readTime} دقائق
              </span>
              <span>{new Date(a.date).toLocaleDateString("ar-EG")}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
