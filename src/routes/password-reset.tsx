import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import OrnamentalDivider from "@/components/OrnamentalDivider";
import { KeyRound, Mail } from "lucide-react";

export const Route = createFileRoute("/password-reset")({
  head: () => ({
    meta: [
      { title: "إعادة تعيين كلمة المرور — هِمَّتي لِأمّتي" },
      { name: "description", content: "أعد تعيين كلمة مرورك بأمان عبر رابطٍ يُرسل إلى بريدك الإلكتروني." },
    ],
  }),
  component: PasswordResetPage,
});

function PasswordResetPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Supabase v2 قد يضع الـ token في hash أو query params حسب الإعداد
  useEffect(() => {
    const hash   = window.location.hash;
    const search = window.location.search;
    if (
      hash.includes("type=recovery")   || hash.includes("access_token") ||
      search.includes("type=recovery") || search.includes("access_token")
    ) {
      setMode("reset");
    }
  }, []);

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().email("بريد غير صالح").safeParse(email.trim());
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/password-reset`,
    });
    setSubmitting(false);
    if (error) {
      toast.error("تعذّر إرسال البريد، حاول لاحقًا");
      return;
    }
    toast.success("✉️ تحقّق من بريدك — أُرسل رابط إعادة التعيين");
  };

  const submitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("كلمة المرور 8 أحرف على الأقل");
      return;
    }
    if (password !== confirm) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || "تعذّر التحديث");
      return;
    }
    toast.success("تم تحديث كلمة المرور بنجاح ✓");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <div className="text-center mb-6">
        <KeyRound className="h-10 w-10 mx-auto text-[var(--gold)] mb-2" />
        <h1 className="font-display text-3xl">إعادة تعيين كلمة المرور</h1>
        <OrnamentalDivider />
      </div>

      <div className="card-elegant rounded-2xl p-6">
        {mode === "request" ? (
          <form onSubmit={requestReset} className="space-y-4">
            <p className="text-sm text-muted-foreground text-center mb-2">
              أدخل بريدك الإلكتروني لإرسال رابط إعادة التعيين.
            </p>
            <div>
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" type="email" required dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              <Mail className="h-4 w-4 ml-2" />
              {submitting ? "جارٍ الإرسال…" : "أرسل رابط إعادة التعيين"}
            </Button>
            <Link to="/auth" className="block text-center text-sm text-primary hover:underline">
              العودة لتسجيل الدخول
            </Link>
          </form>
        ) : (
          <form onSubmit={submitNewPassword} className="space-y-4">
            <p className="text-sm text-muted-foreground text-center mb-2">
              اختر كلمة مرور جديدة (8 أحرف فأكثر).
            </p>
            <div>
              <Label htmlFor="pwd">كلمة المرور الجديدة</Label>
              <Input id="pwd" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cpwd">تأكيد كلمة المرور</Label>
              <Input id="cpwd" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "جارٍ التحديث…" : "حفظ كلمة المرور الجديدة"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}