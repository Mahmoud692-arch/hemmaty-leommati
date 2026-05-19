import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import OrnamentalDivider from "@/components/OrnamentalDivider";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول / إنشاء حساب — هِمَّتي لِأمّتي" },
      { name: "description", content: "أنشئ حسابك أو سجّل دخولك لتبدأ رحلتك الإيمانية." },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "الاسم قصير جدًا").max(100),
  email: z.string().trim().email("بريد إلكتروني غير صالح").max(255),
  phone: z.string().trim().min(6, "رقم الهاتف قصير").max(20),
  date_of_birth: z.string().min(1, "تاريخ الميلاد مطلوب"),
  country: z.string().trim().min(2, "البلد مطلوب").max(80),
  password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل").max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email("بريد إلكتروني غير صالح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");
      return;
    }
    setSubmitting(true);
    const { full_name, email, phone, date_of_birth, country, password } = parsed.data;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email`,
        data: { full_name, phone, date_of_birth, country },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message.includes("registered") ? "هذا البريد مسجّل بالفعل" : error.message);
      return;
    }
    toast.success("تم إنشاء الحساب! راجع بريدك الإلكتروني للتفعيل 📩");
    navigate({ to: "/verify-email" });
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (lockedUntil && new Date() < lockedUntil) {
      const mins = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
      toast.error(`تم تجميد الدخول مؤقتًا، حاول بعد ${mins} دقيقة`);
      return;
    }
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setSubmitting(false);
    if (error) {
      const next = loginAttempts + 1;
      setLoginAttempts(next);
      if (next >= 5) {
        setLockedUntil(new Date(Date.now() + 5 * 60_000));
        setLoginAttempts(0);
        toast.error("محاولات كثيرة — تم تجميد الدخول لمدة 5 دقائق");
      } else {
        toast.error(`بيانات الدخول غير صحيحة (${next}/5)`);
      }
      return;
    }
    setLoginAttempts(0);
    setLockedUntil(null);
    toast.success("أهلًا بعودتك 💚");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <div className="text-center mb-8">
        <Link to="/" className="font-display text-3xl gold-text">
          هِمَّتي لِأمّتي
        </Link>
        <p className="text-sm text-muted-foreground mt-2">انضمّ إلى رحلة الهمّة والعمل</p>
        <OrnamentalDivider />
      </div>

      <div className="card-elegant rounded-2xl p-6">
        <Tabs defaultValue="login">
          <TabsList className="grid grid-cols-2 w-full mb-6">
            <TabsTrigger value="login">دخول</TabsTrigger>
            <TabsTrigger value="signup">حساب جديد</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" name="email" type="email" required dir="ltr" />
              </div>
              <div>
                <Label htmlFor="password">كلمة المرور</Label>
                <Input id="password" name="password" type="password" required />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "جاري الدخول..." : "تسجيل الدخول"}
              </Button>
              <Link to="/password-reset" className="block text-center text-xs text-primary hover:underline mt-2">
                نسيت كلمة المرور؟
              </Link>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <Label htmlFor="full_name">الاسم الكامل *</Label>
                <Input id="full_name" name="full_name" required maxLength={100} />
              </div>
              <div>
                <Label htmlFor="email_s">البريد الإلكتروني *</Label>
                <Input id="email_s" name="email" type="email" required dir="ltr" />
              </div>
              <div>
                <Label htmlFor="phone">رقم الهاتف *</Label>
                <Input id="phone" name="phone" type="tel" required dir="ltr" maxLength={20} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="date_of_birth">تاريخ الميلاد *</Label>
                  <Input id="date_of_birth" name="date_of_birth" type="date" required />
                </div>
                <div>
                  <Label htmlFor="country">البلد *</Label>
                  <Input id="country" name="country" required maxLength={80} />
                </div>
              </div>
              <div>
                <Label htmlFor="password_s">كلمة المرور * (8 أحرف فأكثر)</Label>
                <Input id="password_s" name="password" type="password" required minLength={8} />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "جاري الإنشاء..." : "إنشاء الحساب"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                بإنشاء حساب فإنّك توافق على شروط الموقع الإسلامية ورسالته.
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}