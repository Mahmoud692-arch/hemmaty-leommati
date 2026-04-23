import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BADGES } from "@/lib/journey";

export default function UserBadges() {
  const { user } = useAuth();
  const [earned, setEarned] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_badges")
      .select("badge_key")
      .eq("user_id", user.id)
      .then(({ data }) => setEarned(data?.map((d) => d.badge_key) ?? []));
  }, [user]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Object.entries(BADGES).map(([key, b]) => {
        const has = earned.includes(key);
        return (
          <div
            key={key}
            className={`card-elegant rounded-2xl p-4 text-center ${has ? "" : "opacity-40 grayscale"}`}
          >
            <div className="text-3xl mb-1">{b.icon}</div>
            <div className="font-semibold text-sm">{b.title}</div>
            <div className="text-xs text-muted-foreground">{b.description}</div>
          </div>
        );
      })}
    </div>
  );
}
