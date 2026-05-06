import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Shield, User as UserIcon, RefreshCcw, LogIn, LogOut } from "lucide-react";
import OrnamentalDivider from "@/components/OrnamentalDivider";
import AvatarChanger from "@/components/AvatarChanger";
import { toast } from "sonner";

export const Route = createFileRoute("/me")({
  head: () => ({
    meta: [{ title: "حالتي — هِمَّتي لِأمّتي" }],
  }),
  component: MePage,
});

function MePage() {
  const { user, profile, isAdmin, loading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleRefresh = async () => {
    await refreshProfile();
    toast.success("تم تحديث الحالة");
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("تم تسجيل الخروج");
    navigate({ to: "/auth" });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
        جاري التحقق...
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <div className="text-center mb-8">
        <Shield className="h-12 w-12 mx-auto text-[var(--gold)] mb-3" />
        <h1 className="font-display text-4xl">حالتي الحاليّة</h1>
        <OrnamentalDivider />
      </div>

      {!user ? (
        <div className="card-elegant rounded-2xl p-8 text-center space-y-4">
          <p className="text-muted-foreground">لم تقم بتسجيل الدخول بعد.</p>
          <Button asChild>
            <Link to="/auth">
              <LogIn className="h-4 w-4 ml-1" /> تسجيل الدخول
            </Link>
          </Button>
        </div>
      ) : (
        <div className="card-elegant rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-[var(--gold)]/15 flex items-center justify-center">
              {isAdmin ? (
                <Shield className="h-6 w-6 text-[var(--gold)]" />
              ) : (
                <UserIcon className="h-6 w-6 text-[var(--gold)]" />
              )}
            </div>
            <div>
              <p className="font-semibold">{profile?.full_name ?? "مستخدم"}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="الدور" value={isAdmin ? "مدير (admin)" : "مستخدم (user)"} highlight={isAdmin} />
            <Field label="المستوى" value={String(profile?.level ?? 1)} />
            <Field label="النقاط" value={String(profile?.total_points ?? 0)} />
            <Field label="معرّف الحساب" value={user.id.slice(0, 8) + "…"} />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={handleRefresh} variant="secondary" size="sm">
              <RefreshCcw className="h-4 w-4 ml-1" /> إعادة التحقق
            </Button>
            {isAdmin && (
              <Button asChild size="sm">
                <Link to="/admin">
                  <Shield className="h-4 w-4 ml-1" /> لوحة الإدارة
                </Link>
              </Button>
            )}
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="h-4 w-4 ml-1" /> خروج
            </Button>
          </div>

          {!isAdmin && (
            <p className="text-xs text-muted-foreground border-t pt-3">
              إذا تم منحك صلاحية الإدارة للتو، اضغط <strong>«إعادة التحقق»</strong> أو سجّل خروجًا ودخولًا
              مرّةً أخرى لتفعيل الصلاحية.
            </p>
          )}
        </div>
      )}

      {user && (
        <div className="card-elegant rounded-2xl p-6 mt-6">
          <h2 className="font-display text-lg mb-3">صورتي الشخصية</h2>
          <AvatarChanger />
        </div>
      )}

      <div className="text-center mt-8">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`font-semibold ${highlight ? "text-[var(--gold)]" : ""}`}>{value}</div>
    </div>
  );
}
