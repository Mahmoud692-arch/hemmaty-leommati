import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { ArrowRight } from "lucide-react";
import { stories as staticStories, type Story } from "@/data/stories";
import OrnamentalDivider from "@/components/OrnamentalDivider";

export const Route = createFileRoute("/stories/$slug")({
  loader: async ({ params }) => {
    const story = staticStories.find((item) => item.slug === params.slug);
    if (!story) throw notFound();
    return { story };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.story.title} — قصص الأنبياء` },
          { name: "description", content: loaderData.story.excerpt ?? loaderData.story.title },
          { property: "og:title", content: loaderData.story.title },
          { property: "og:description", content: loaderData.story.excerpt ?? loaderData.story.title },
          ...(loaderData.story.cover_image
            ? [{ property: "og:image", content: loaderData.story.cover_image as string }]
            : []),
        ]
      : [],
  }),
  notFoundComponent: () => (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="font-display text-3xl mb-4">القصة غير موجودة</h1>
      <Link to="/stories" className="text-primary hover:underline">العودة إلى القصص</Link>
    </div>
  ),
  component: StoryPage,
});

function StoryPage() {
  const { story } = Route.useLoaderData();
  return (
    <article className="container mx-auto px-4 py-12 max-w-3xl">
      <Link to="/stories" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-8">
        <ArrowRight className="h-4 w-4" /> العودة للقصص
      </Link>
      {story.prophet_name && (
        <div className="text-sm text-[var(--gold)] mb-2">{story.prophet_name}</div>
      )}
      <h1 className="font-display text-3xl md:text-5xl mb-4 leading-tight">{story.title}</h1>
      {story.cover_image && (
        <img src={story.cover_image} alt={story.title} className="w-full rounded-2xl my-6" />
      )}
      <OrnamentalDivider />
      <div className="article-content text-foreground/90 leading-loose">
        <ReactMarkdown>{story.content ?? ""}</ReactMarkdown>
      </div>
    </article>
  );
}
