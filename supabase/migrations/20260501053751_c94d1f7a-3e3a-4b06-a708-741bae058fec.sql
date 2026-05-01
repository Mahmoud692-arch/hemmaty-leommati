
DROP VIEW IF EXISTS public.article_likes_count CASCADE;
CREATE VIEW public.article_likes_count WITH (security_invoker = true) AS
SELECT article_slug, count(*)::integer AS likes_count
FROM public.article_likes
GROUP BY article_slug;
GRANT SELECT ON public.article_likes_count TO authenticated, anon;
