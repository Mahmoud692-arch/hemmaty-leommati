import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import OrnamentalDivider from "@/components/OrnamentalDivider";
import { Scroll, Bookmark, Compass, BookOpen } from "lucide-react";

export const Route = createFileRoute("/hadiths")({
  head: () => ({
    meta: [
      { title: "الأحاديث النبوية الشريفة — هِمَّتي لِأمّتي" },
      {
        name: "description",
        content: "تصفح مجموعات الأحاديث النبوية المطهرة: الأربعون النووية، صحيح البخاري، وصحيح مسلم مع الشرح والفوائد.",
      },
    ],
  }),
  component: HadithsPortalPage,
});

function HadithsPortalPage() {
  const { location } = useRouterState();

  if (location.pathname !== "/hadiths" && location.pathname !== "/hadiths/") {
    return <Outlet />;
  }

  const collections = [
    {
      id: "nawawi",
      title: "الأربعون النووية",
      subtitle: "جوامع كَلِم النبي ﷺ التي جمعها الإمام النووي",
      description: "٤٢ حديثاً جامعاً تعد قواعد الدين الكبرى، مفصلة بشرح وافٍ ومعاني الكلمات والفوائد العملية والتطبيقات اليومية للشباب.",
      count: "٤٢ حديثاً",
      to: "/hadiths/nawawi",
      icon: Bookmark,
      colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-500 hover:border-amber-500/30",
      gradientClass: "from-amber-500/5 to-amber-500/10 border-amber-500/20",
      iconColor: "text-amber-500"
    },
    {
      id: "bukhari",
      title: "صحيح البخاري",
      subtitle: "الجامع المسند الصحيح المختصر للإمام البخاري",
      description: "أصح الكتب المصنفة في الحديث النبوي الشريف بعد كتاب الله تعالى. تصفح أحاديثه الصحيحة المنوعة مع الرواة والشرح الفقهي المبسط.",
      count: "٥٠٠ حديث",
      to: "/hadiths/bukhari",
      icon: Scroll,
      colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 hover:border-emerald-500/30",
      gradientClass: "from-emerald-500/5 to-emerald-500/10 border-emerald-500/20",
      iconColor: "text-emerald-500"
    },
    {
      id: "muslim",
      title: "صحيح مسلم",
      subtitle: "المسند الصحيح للإمام مسلم بن الحجاج",
      description: "المصنف الثاني في الصحة والمنهج والترتيب العلمي الدقيق. باقة مميزة ومختارة من أصح الأحاديث لتكون دليلاً سلوكياً في حياتك.",
      count: "٥٠٠ حديث",
      to: "/hadiths/muslim",
      icon: Compass,
      colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-500 hover:border-blue-500/30",
      gradientClass: "from-blue-500/5 to-blue-500/10 border-blue-500/20",
      iconColor: "text-blue-500"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12 md:py-16 max-w-5xl">
      <div className="text-center mb-12">
        <h1 className="font-display text-4xl md:text-5xl mb-3">الأحاديث النبوية الشريفة</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
          منهل الهدى والنور النبوي. اختر إحدى المجموعات الإسلامية لتبدأ رحلتك في قراءة أحاديث المصطفى ﷺ وتدبّر شرحها وفوائدها العملية.
        </p>
        <OrnamentalDivider />
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {collections.map((col) => {
          const Icon = col.icon;
          return (
            <Link
              key={col.id}
              to={col.to}
              className={`flex flex-col justify-between border rounded-3xl p-6 md:p-8 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-gradient-to-b ${col.gradientClass} group`}
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-card shadow-sm`}>
                    <Icon className={`h-6 w-6 ${col.iconColor}`} />
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${col.colorClass}`}>
                    {col.count}
                  </span>
                </div>

                <h2 className="font-display text-2xl mb-2 group-hover:text-primary transition-colors">
                  {col.title}
                </h2>
                <h3 className="text-xs font-medium text-muted-foreground mb-4">
                  {col.subtitle}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  {col.description}
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-sm font-semibold group-hover:underline text-primary mt-auto">
                تصفح المجموعة <BookOpen className="h-4 w-4" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
