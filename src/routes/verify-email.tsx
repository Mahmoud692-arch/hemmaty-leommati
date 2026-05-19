import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      const session = data.session;

      // لو مفيش مستخدم → يرجع تسجيل الدخول
      if (!session) {
        navigate({ to: "/auth" });
        return;
      }

      // لو المستخدم موجود → روح للداشبورد
      navigate({ to: "/dashboard" });
    };

    checkSession();
  }, [navigate]);

  return (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-bold mb-4">
        جاري التحقق من البريد الإلكتروني 📩
      </h1>
      <p className="text-muted-foreground">
        لو فعلت حسابك سيتم تحويلك تلقائيًا...
      </p>
    </div>
  );
}