import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/useAuth";
import Layout from "@/components/Layout";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display gold-text">404</h1>
        <h2 className="mt-4 text-xl font-semibold">الصفحةُ غير موجودة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          الصفحة التي تبحث عنها غير موجودة أو تمّ نقلها.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "هِمَّتي لِأمّتي — منصةُ الإيمانِ والعمل" },
      {
        name: "description",
        content:
          "منصّةٌ توعويةٌ تُعينك على التقرّب إلى الله من خلال مقالات، أحاديث الأربعين النووية، ورحلة إيمانية تفاعلية.",
      },
      { property: "og:title", content: "هِمَّتي لِأمّتي — منصةُ الإيمانِ والعمل" },
      {
        property: "og:description",
        content: "منصةٌ تربويةٌ إيمانيةٌ تفاعلية تجمع المقال والحديث والرحلة الإيمانية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "هِمَّتي لِأمّتي — منصةُ الإيمانِ والعمل" },
      { name: "description", content: "موقع هِمَّتِي لأمَّتِي منصة دينية توعوية تنشر محتوى إسلامي موثوق، مقالات، وأحاديث تهدف لرفع الوعي وبناء جيل واعٍ." },
      { property: "og:description", content: "موقع هِمَّتِي لأمَّتِي منصة دينية توعوية تنشر محتوى إسلامي موثوق، مقالات، وأحاديث تهدف لرفع الوعي وبناء جيل واعٍ." },
      { name: "twitter:description", content: "موقع هِمَّتِي لأمَّتِي منصة دينية توعوية تنشر محتوى إسلامي موثوق، مقالات، وأحاديث تهدف لرفع الوعي وبناء جيل واعٍ." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/cCKw23SCrdhkZIIerwSRhw8c7hj2/social-images/social-1776962398809-IMG_20260423_183434_123.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/cCKw23SCrdhkZIIerwSRhw8c7hj2/social-images/social-1776962398809-IMG_20260423_183434_123.webp" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700&family=Cairo:wght@300;400;600;700;900&family=Reem+Kufi:wght@400;500;600;700&family=Aref+Ruqaa:wght@400;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Layout>
        <Outlet />
      </Layout>
    </AuthProvider>
  );
}
