import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import {
  Moon,
  Sun,
  Menu,
  X,
  BookOpen,
  Home,
  Info,
  User,
  LogOut,
  Shield,
  MessageCircleQuestion,
  Trophy,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import NotificationBell from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };
  return { dark, toggle };
}

const navItems = [
  { to: "/", label: "الرئيسية", icon: Home },
  { to: "/quran", label: "القرآن الكريم", icon: BookOpen },
  { to: "/articles", label: "المقالات", icon: BookOpen },
  { to: "/hadiths", label: "الأحاديث النبوية", icon: BookOpen },
  { to: "/stories", label: "قصص الأنبياء", icon: BookOpen },
  { to: "/lessons", label: "الدروس", icon: BookOpen },
  { to: "/leaderboard", label: "المتصدّرون", icon: Trophy },
  { to: "/questions", label: "الأسئلة", icon: MessageCircleQuestion },
  { to: "/quizzes", label: "الاختبارات", icon: Trophy },
  { to: "/about", label: "عن الموقع", icon: Info },
] as const;

export default function Layout({ children }: { children: ReactNode }) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { location } = useRouterState();

  useEffect(() => setOpen(false), [location.pathname]);

  // Ping last_seen periodically while logged in
  useEffect(() => {
    if (!user) return;
    supabase.rpc("touch_last_seen");
    const t = window.setInterval(() => { supabase.rpc("touch_last_seen"); }, 60000);
    return () => window.clearInterval(t);
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-full bg-[var(--gradient-gold)] flex items-center justify-center shadow-[var(--shadow-gold)] text-2xl">
              ﷽
            </div>
            <div className="leading-tight">
              <div className="font-display text-lg gold-text">هِمَّتي لِأمّتي</div>
              <div className="text-[10px] text-muted-foreground">منصةُ الإيمانِ والعمل</div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
                activeProps={{ className: "text-primary bg-accent/60 font-semibold" }}
                activeOptions={{ exact: it.to === "/" }}
              >
                {it.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="تبديل الوضع">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {user && <NotificationBell />}

            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/dashboard"
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/40 hover:bg-accent/60 text-sm"
                >
                  <div className="w-7 h-7 rounded-full bg-[var(--gradient-gold)] flex items-center justify-center text-xs font-bold text-[var(--gold-foreground)]">
                    {profile?.full_name?.[0] ?? "م"}
                  </div>
                  <span className="font-medium">
                    {profile?.full_name?.split(" ")[0] ?? "حسابي"}
                  </span>
                </Link>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="outline" size="sm" className="gap-1">
                      <Shield className="h-3 w-3" /> الإدارة
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="خروج">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Link to="/auth" className="hidden sm:block">
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  <User className="h-4 w-4 ms-1" /> دخول
                </Button>
              </Link>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {open && (
          <div className="lg:hidden border-t border-border bg-background animate-fade-in-up">
            <div className="container mx-auto px-4 py-3 flex flex-col gap-1">
              {navItems.map((it) => {
                const Icon = it.icon;
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/40"
                    activeProps={{ className: "bg-accent/60 text-primary font-semibold" }}
                    activeOptions={{ exact: it.to === "/" }}
                  >
                    <Icon className="h-4 w-4" /> {it.label}
                  </Link>
                );
              })}
              <div className="border-t border-border my-2" />
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/40"
                  >
                    <User className="h-4 w-4" /> لوحة الإنجاز
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/40"
                    >
                      <Shield className="h-4 w-4" /> لوحة الإدارة
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/40 text-right text-destructive"
                  >
                    <LogOut className="h-4 w-4" /> تسجيل الخروج
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground"
                >
                  <User className="h-4 w-4" /> تسجيل الدخول / حساب جديد
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 relative z-10">{children}</main>

      <footer className="relative z-10 border-t border-border mt-16 bg-card/50">
        <div className="container mx-auto px-4 py-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div>
            <div className="font-display text-xl gold-text mb-2">هِمَّتي لِأمّتي</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              منصّةٌ توعويةٌ تُعينك على التقرّب إلى الله، وتُهذّب نفسك، وتربّي همّتك خطوةً خطوة.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">روابط سريعة</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/articles" className="hover:text-primary">
                  المقالات
                </Link>
              </li>
              <li>
                <Link to="/hadiths" className="hover:text-primary">
                  الأحاديث النبوية
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-primary">
                  عن الموقع
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">قنواتنا</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://www.facebook.com/share/18SsDDgzCr/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-primary"
                >
                  فيسبوك
                </a>
              </li>
              <li>
                <a
                  href="https://whatsapp.com/channel/0029VbBZyop2ER6j2w21mo3Z"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-primary"
                >
                  واتساب
                </a>
              </li>
              <li>
                <a
                  href="https://t.me/hemmaty_leommati"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-primary"
                >
                  تليجرام
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} هِمَّتي لِأمّتي — جميعُ الحقوق محفوظة
        </div>
      </footer>

      <Toaster richColors position="top-center" />
    </div>
  );
}
