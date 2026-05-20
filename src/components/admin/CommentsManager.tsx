import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CommentRow {
  id: string;
  user_id: string;
  article_slug: string;
  content: string;
  is_approved: boolean;
  is_hidden: boolean;
  created_at: string;
  profile?: { full_name: string; email: string } | null;
}

export default function CommentsManager() {
  const [items, setItems] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("article_comments").select("*").order("created_at", { ascending: false }).limit(200);
    const ids = Array.from(new Set((data ?? []).map((c) => c.user_id)));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("user_id,full_name,email").in("user_id", ids)
      : { data: [] as { user_id: string; full_name: string; email: string }[] };
    const m = new Map((profs ?? []).map((p) => [p.user_id, p]));
    setItems(((data ?? []) as CommentRow[]).map((c) => ({ ...c, profile: m.get(c.user_id) ?? null })));
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const approve = async (id: string) => {
    await supabase.from("article_comments").update({ is_approved: true, is_hidden: false }).eq("id", id);
    toast.success("تم الاعتماد");
    load();
  };
  const hide = async (id: string) => {
    await supabase.from("article_comments").update({ is_hidden: true }).eq("id", id);
    toast.success("تم الإخفاء");
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("حذف التعليق؟")) return;
    await supabase.from("article_comments").delete().eq("id", id);
    load();
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">جارٍ التحميل…</div>;

  return (
    <div>
      <h2 className="font-display text-2xl mb-4">التعليقات</h2>
      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground rounded-xl border border-dashed">لا تعليقات</div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => (
            <div key={c.id} className="rounded-xl border p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <span className="font-medium text-foreground">{c.profile?.full_name ?? "—"}</span>
                <span>•</span>
                <span>{c.article_slug}</span>
                <span>•</span>
                <span>{new Date(c.created_at).toLocaleString("ar-EG")}</span>
                {c.is_hidden && <span className="text-destructive">مخفي</span>}
                {!c.is_approved && <span className="text-amber-600">بانتظار الاعتماد</span>}
              </div>
              <p className="text-sm mb-3 whitespace-pre-wrap">{c.content}</p>
              <div className="flex gap-1">
                {!c.is_approved && (
                  <Button size="sm" onClick={() => approve(c.id)}>
                    <Check className="h-3 w-3 ms-1" /> اعتماد
                  </Button>
                )}
                {!c.is_hidden && (
                  <Button size="sm" variant="outline" onClick={() => hide(c.id)}>
                    <EyeOff className="h-3 w-3 ms-1" /> إخفاء
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => remove(c.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
