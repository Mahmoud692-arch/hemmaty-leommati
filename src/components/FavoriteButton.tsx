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

  const table = entityType === "article" ? "article_favorites" : "lesson_favorites";
  const colName = entityType === "article" ? "article_slug" : "lesson_id";

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from(table)
        .select("id")
        .eq("user_id", user.id)
        .eq(colName, entityId)
        .maybeSingle();
      if (!cancelled) setActive(!!data);
    })();
    return () => { cancelled = true; };
  }, [user, entityId, table, colName]);

  const toggle = async () => {
    if (!user) {
      toast.error("سجّل دخولك لإضافة المفضلة");
      return;
    }
    setBusy(true);
    try {
      if (active) {
        await supabase.from(table).delete().eq("user_id", user.id).eq(colName, entityId);
        setActive(false);
        toast.success("أُزيل من المفضّلة");
      } else {
        const row: Record<string, string> = { user_id: user.id };
        row[colName] = entityId;
        await supabase.from(table).insert(row);
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
