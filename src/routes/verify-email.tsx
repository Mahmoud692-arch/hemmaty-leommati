import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MailCheck, MailWarning, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/verify-email")({
  head: () => ({
    meta: [{ title: "تأكيد البريد الإلكتروني — هِمَّتي لِأمّتي" }],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "confirmed" | "pending">("checking");
  const [email, setEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        navigate({ to: "/auth" });
        return;
      }

      setEmail(session.user.email ?? null);

      const isConfirmed = !!(
        session.user.email_confirmed_at ||
        (session.user as { confirmed_at?: string }).confirmed_at
      );

      if (isConfirmed) {
        setStatus("confirmed");
        setTimeout(() => navigate({ to: "/dashboard" }), 2000);
      } else {
        setStatus("pending");
      }
    };

    check();
  }, [navigate]);

  const resend = async () => {
    if (!email) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    if (error) {
      toast.error("تعذّر إرسال رسالة التأكيد، حاول لاحقاً");
    } else {
      toast.success("✉️ أُرسل رابط تأكيد جديد إلى بريدك");
    }
  };

  return (
    <div className="container mx-auto px-4 py-20 max-w-md text-center">
      {status === "checking" && (
        <div className="space-y-3 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-[var(--gold)]" />
          <p>جارٍ التحقق من حالة بريدك…</p>
        </div>
      )}

      {status === "confirmed" && (
        <div className="space-y-3">
          <MailCheck className="h-14 w-14 mx-auto text-green-500" />
          <h1 className="font-display text-2xl">تم تأكيد بريدك بنجاح ✓</h1>
          <p className="text-muted-foreground text-sm">سيتم تحويلك للوحة التحكم…</p>
        </div>
      )}

      {status === "pending" && (
        <div className="space-y-4">
          <MailWarning className="h-14 w-14 mx-auto text-amber-500" />
          <h1 className="font-display text-2xl">فعّل بريدك الإلكتروني</h1>
          <p className="text-muted-foreground text-sm">
            أرسلنا رابط تأكيد إلى{" "}
            <span className="font-mono text-foreground">{email}</span>.
            <br />افتح البريد واضغط على الرابط لتفعيل حسابك.
          </p>
          <Button onClick={resend} disabled={resending} variant="outline" className="w-full">
            <MailCheck className="h-4 w-4 ml-2" />
            {resending ? "جارٍ الإرسال…" : "إعادة إرسال رابط التأكيد"}
          </Button>
          <Link to="/auth" className="block text-sm text-primary hover:underline mt-2">
            العودة لتسجيل الدخول
          </Link>
        </div>
      )}
    </div>
  );
}