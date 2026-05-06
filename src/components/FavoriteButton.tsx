import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  entityType: "article" | "lesson";
  entityId: string; // slug for article, uuid for lesson
}

export default function FavoriteButton({ entityType, entityId }: Props) {
  const { user } = useAuth();
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const q =
        entityType === "article"
          ? supabase.from("article_favorites").select("id").eq("user_id", user.id).eq("article_slug", entityId)
          : supabase.from("lesson_favorites").select("id").eq("user_id", user.id).eq("lesson_id", entityId);
      const { data } = await q.maybeSingle();
      if (!cancelled) setActive(!!data);
    })();
    return () => { cancelled = true; };
  }, [user, entityId, entityType]);

  const toggle = async () => {
    if (!user) {
      toast.error("سجّل دخولك لإضافة المفضلة");
      return;
    }
    setBusy(true);
    try {
      if (active) {
        if (entityType === "article") {
          await supabase.from("article_favorites").delete().eq("user_id", user.id).eq("article_slug", entityId);
        } else {
          await supabase.from("lesson_favorites").delete().eq("user_id", user.id).eq("lesson_id", entityId);
        }
        setActive(false);
        toast.success("أُزيل من المفضّلة");
      } else {
        if (entityType === "article") {
          await supabase.from("article_favorites").insert({ user_id: user.id, article_slug: entityId });
        } else {
          await supabase.from("lesson_favorites").insert({ user_id: user.id, lesson_id: entityId });
        }
        setActive(true);
        toast.success("أُضيف إلى المفضّلة 💛");
      }
    } catch {
      toast.error("تعذّر التحديث");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={toggle}
      disabled={busy}
      aria-pressed={active}
      aria-label={active ? "إزالة من المفضّلة" : "إضافة إلى المفضّلة"}
    >
      <Heart className={`h-4 w-4 ml-1 ${active ? "fill-current" : ""}`} />
      {active ? "في المفضّلة" : "أضف للمفضّلة"}
    </Button>
  );
}
