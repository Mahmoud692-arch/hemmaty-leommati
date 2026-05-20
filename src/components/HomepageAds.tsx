import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, X } from "lucide-react";

interface Ad {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  link_url: string | null;
  position: string;
}

export default function HomepageAds({ position = "top" }: { position?: string }) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("homepage_ads")
        .select("id,title,body,image_url,link_url,position")
        .eq("position", position)
        .order("order_index");
      if (!cancelled) setAds((data ?? []) as Ad[]);
    })();
    try {
      const raw = localStorage.getItem("dismissed_ads");
      if (raw) setDismissed(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
    return () => { cancelled = true; };
  }, [position]);

  const visible = ads.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try { localStorage.setItem("dismissed_ads", JSON.stringify(Array.from(next))); } catch { /* ignore */ }
  };

  return (
    <div className="container mx-auto px-4 py-4 space-y-3">
      {visible.map((ad) => {
        const Wrapper = ({ children }: { children: React.ReactNode }) =>
          ad.link_url ? (
            <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="block">{children}</a>
          ) : <div>{children}</div>;
        return (
          <div key={ad.id} className="card-elegant rounded-2xl p-4 relative flex items-center gap-4 overflow-hidden">
            <button
              onClick={() => dismiss(ad.id)}
              className="absolute top-2 start-2 text-muted-foreground hover:text-foreground"
              aria-label="إخفاء الإعلان"
            >
              <X className="h-4 w-4" />
            </button>
            <Wrapper>
              <div className="flex items-center gap-4">
                {ad.image_url ? (
                  <img src={ad.image_url} alt={ad.title} className="w-16 h-16 rounded-xl object-cover shrink-0" loading="lazy" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center shrink-0">
                    <Megaphone className="h-5 w-5 text-[var(--gold)]" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-bold">{ad.title}</div>
                  {ad.body && <p className="text-sm text-muted-foreground line-clamp-2">{ad.body}</p>}
                </div>
              </div>
            </Wrapper>
          </div>
        );
      })}
    </div>
  );
}
