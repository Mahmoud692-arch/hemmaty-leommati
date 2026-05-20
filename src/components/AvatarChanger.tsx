import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AvatarChanger() {
  const { user, profile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("الحد الأقصى 2 ميغابايت");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const { data, error } = await supabase.rpc("change_avatar", { _new_url: pub.publicUrl });
      if (error) throw error;
      const res = data as { ok: boolean; reason?: string; next_allowed_at?: string };
      if (!res.ok) {
        if (res.reason === "cooldown") {
          toast.error(
            `يمكن تغيير الصورة مرّة كل 60 يومًا. التاريخ المتاح: ${new Date(
              res.next_allowed_at!,
            ).toLocaleDateString("ar-EG")}`,
          );
        } else {
          toast.error("تعذّر التحديث");
        }
        return;
      }
      toast.success("تم تحديث الصورة الشخصية");
      await refreshProfile();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطأ");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="w-20 h-20 rounded-full overflow-hidden bg-[var(--gradient-gold)]/20 flex items-center justify-center">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Camera className="h-8 w-8 text-[var(--gold)]" />
        )}
      </div>
      <div>
        <label className="inline-flex">
          <input type="file" accept="image/*" className="hidden" onChange={onPick} disabled={busy} />
          <Button asChild size="sm" variant="outline" disabled={busy}>
            <span>
              {busy ? <Loader2 className="h-4 w-4 ms-1 animate-spin" /> : <Camera className="h-4 w-4 ms-1" />}
              تغيير الصورة
            </span>
          </Button>
        </label>
        <p className="text-xs text-muted-foreground mt-1">يُسمح بالتغيير مرّة كل 60 يومًا</p>
      </div>
    </div>
  );
}
