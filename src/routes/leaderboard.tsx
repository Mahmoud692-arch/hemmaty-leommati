import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import OrnamentalDivider from "@/components/OrnamentalDivider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "لوحة المتصدّرين — هِمَّتي لِأمّتي" },
      { name: "description", content: "أعلى المشاركين في الرحلة الإيمانية." },
      { property: "og:title", content: "لوحة المتصدّرين — هِمَّتي لِأمّتي" },
      { property: "og:description", content: "أعلى المشاركين في الرحلة الإيمانية." },
    ],
  }),
  component: LeaderboardPage,
});

interface Row {
  rank: number;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  points: number;
}

function Board({ period }: { period: "week" | "month" | "all" }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    supabase
      .rpc("leaderboard", { _period: period })
      .then(({ data }) => {
        setRows((data as Row[]) ?? []);
        setLoading(false);
      });
  }, [period]);

  if (loading) return <div className="text-center text-muted-foreground py-10">جارٍ التحميل…</div>;
  if (!rows.length) return <div className="text-center text-muted-foreground py-10">لا توجد بيانات بعد.</div>;

  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const rankColor =
          r.rank === 1 ? "text-yellow-500" : r.rank === 2 ? "text-gray-400" : r.rank === 3 ? "text-amber-700" : "text-muted-foreground";
        return (
          <div key={r.user_id} className="card-elegant rounded-xl p-3 flex items-center gap-3">
            <div className={`w-10 text-center font-bold ${rankColor}`}>
              {r.rank <= 3 ? <Medal className="h-6 w-6 mx-auto" /> : `#${r.rank}`}
            </div>
            <div className="w-10 h-10 rounded-full bg-[var(--gradient-gold)]/20 flex items-center justify-center overflow-hidden">
              {r.avatar_url ? (
                <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold">{r.full_name?.[0] ?? "?"}</span>
              )}
            </div>
            <div className="flex-1 font-semibold truncate">{r.full_name ?? "مستخدم"}</div>
            <div className="text-[var(--gold)] font-bold">{r.points} نقطة</div>
          </div>
        );
      })}
    </div>
  );
}

function LeaderboardPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="text-center mb-6">
        <Trophy className="h-12 w-12 mx-auto text-[var(--gold)]" />
        <h1 className="font-display text-4xl mt-2 gold-text">لوحة المتصدّرين</h1>
        <p className="text-muted-foreground">أعلى المشاركين في الرحلة الإيمانية</p>
        <OrnamentalDivider />
      </div>

      <Tabs defaultValue="all">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="week">هذا الأسبوع</TabsTrigger>
          <TabsTrigger value="month">هذا الشهر</TabsTrigger>
          <TabsTrigger value="all">الإجمالي</TabsTrigger>
        </TabsList>
        <TabsContent value="week"><Board period="week" /></TabsContent>
        <TabsContent value="month"><Board period="month" /></TabsContent>
        <TabsContent value="all"><Board period="all" /></TabsContent>
      </Tabs>

      <div className="text-center mt-8">
        <Link to="/dashboard" className="text-sm text-primary hover:underline">عودة للوحتك</Link>
      </div>
    </div>
  );
}
