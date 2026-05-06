import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import OrnamentalDivider from "@/components/OrnamentalDivider";
import FavoriteButton from "@/components/FavoriteButton";

export const Route = createFileRoute("/lessons/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("lessons")
      .select("*")
      .eq("slug", params.slug)
      .eq("status", "published")
      .maybeSingle();
    if (!data) throw notFound();
    return { lesson: data };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.lesson.title} — الدروس` },
          { name: "description", content: loaderData.lesson.description ?? loaderData.lesson.title },
          { property: "og:title", content: loaderData.lesson.title },
          { property: "og:description", content: loaderData.lesson.description ?? loaderData.lesson.title },
          ...((loaderData.lesson.thumbnail ?? loaderData.lesson.cover_image)
            ? [{ property: "og:image", content: (loaderData.lesson.thumbnail ?? loaderData.lesson.cover_image) as string }]
            : []),
        ]
      : [],
  }),
  notFoundComponent: () => (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="font-display text-3xl mb-4">الدرس غير موجود</h1>
      <Link to="/lessons" className="text-primary hover:underline">العودة إلى الدروس</Link>
    </div>
  ),
  component: LessonPage,
});

function getYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
  return m?.[1] ?? null;
}

function LessonPage() {
  const { lesson } = Route.useLoaderData();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ytId = getYouTubeId(lesson.youtube_url);

  // record last_visit on mount + periodic for upload videos
  useEffect(() => {
    if (!user) return;
    supabase.from("last_visits").upsert(
      {
        user_id: user.id,
        entity_type: "lesson",
        entity_id: lesson.id,
        title: lesson.title,
        position_sec: 0,
      },
      { onConflict: "user_id,entity_type,entity_id" },
    );
  }, [user, lesson.id, lesson.title]);

  useEffect(() => {
    if (!user || lesson.source_type !== "upload") return;
    const t = window.setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      const sec = Math.floor(v.currentTime);
      supabase.from("lesson_progress").upsert(
        {
          user_id: user.id,
          lesson_id: lesson.id,
          last_position_sec: sec,
          seconds_watched: sec,
          completed: lesson.duration_seconds ? sec / lesson.duration_seconds >= 0.9 : false,
        },
        { onConflict: "user_id,lesson_id" },
      );
    }, 10000);
    return () => window.clearInterval(t);
  }, [user, lesson.id, lesson.source_type, lesson.duration_seconds]);

  return (
    <article className="container mx-auto px-4 py-10 max-w-4xl">
      <Link to="/lessons" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowRight className="h-4 w-4" /> العودة للدروس
      </Link>
      <h1 className="font-display text-2xl md:text-4xl mb-4 leading-tight">{lesson.title}</h1>
      {lesson.instructor && (
        <div className="text-sm text-muted-foreground mb-4">{lesson.instructor}</div>
      )}

      <div className="rounded-2xl overflow-hidden bg-black aspect-video mb-6">
        {lesson.source_type === "youtube" && ytId ? (
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            title={lesson.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        ) : lesson.source_type === "upload" && lesson.video_url ? (
          <video ref={videoRef} src={lesson.video_url} controls className="w-full h-full" />
        ) : (
          <div className="text-white text-center p-10">المصدر غير متاح</div>
        )}
      </div>

      <OrnamentalDivider />
      {lesson.description && (
        <p className="text-foreground/90 leading-loose whitespace-pre-line">{lesson.description}</p>
      )}
    </article>
  );
}
