import { createFileRoute } from "@tanstack/react-router";
import OrnamentalDivider from "@/components/OrnamentalDivider";
import { Facebook, Send, MessageCircle, Heart, Target, Compass } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "عن الموقع — هِمَّتي لِأمّتي" },
      {
        name: "description",
        content: "تعرّف على رسالة منصّة هِمَّتي لِأمّتي ووسائل التواصل معنا.",
      },
      { property: "og:title", content: "عن الموقع — هِمَّتي لِأمّتي" },
      {
        property: "og:description",
        content: "تعرّف على رسالة منصّة هِمَّتي لِأمّتي ووسائل التواصل معنا.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-16 max-w-3xl">
      <div className="text-center">
        <h1 className="font-display text-4xl md:text-5xl mb-3">عن الموقع</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          منصّةٌ تربويةٌ تُعينك على التقرّب إلى الله بأسلوبٍ بسيطٍ وعميق.
        </p>
        <OrnamentalDivider />
      </div>

      <section className="card-elegant rounded-2xl p-8 my-8 text-center">
        <p className="quran-text text-primary mb-2" style={{ fontSize: "1.5rem" }}>
          ﴿وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ﴾
        </p>
        <p className="text-sm text-muted-foreground">سورة المائدة: 2</p>
      </section>

      <div className="grid md:grid-cols-3 gap-5 my-10">
        <div className="card-elegant rounded-2xl p-6 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-[var(--gold)]/15 flex items-center justify-center mb-3">
            <Target className="h-6 w-6 text-[var(--gold)]" />
          </div>
          <h3 className="font-display text-lg mb-2">رسالتنا</h3>
          <p className="text-sm text-muted-foreground">
            نشر الوعي الديني وتربية همّة الشباب على الالتزام والثبات.
          </p>
        </div>
        <div className="card-elegant rounded-2xl p-6 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-[var(--gold)]/15 flex items-center justify-center mb-3">
            <Compass className="h-6 w-6 text-[var(--gold)]" />
          </div>
          <h3 className="font-display text-lg mb-2">منهجنا</h3>
          <p className="text-sm text-muted-foreground">
            محتوًى مُراجَع شرعيًا، بأسلوبٍ سهلٍ مع تطبيقاتٍ عملية في الحياة.
          </p>
        </div>
        <div className="card-elegant rounded-2xl p-6 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-[var(--gold)]/15 flex items-center justify-center mb-3">
            <Heart className="h-6 w-6 text-[var(--gold)]" />
          </div>
          <h3 className="font-display text-lg mb-2">هدفنا</h3>
          <p className="text-sm text-muted-foreground">
            أن تخرج من زيارتك أقربَ إلى الله، أنفعَ لنفسك ولأمّتك.
          </p>
        </div>
      </div>

      <section className="my-12 space-y-4 text-foreground/90 leading-loose">
        <h2 className="font-display text-2xl mt-6 mb-3">قصّتنا</h2>
        <p>
          انطلقت "هِمَّتي لِأمّتي" من إيمانٍ بأن الشباب المسلم يستحقّ محتوًى دينيًا قويًا في عصرٍ
          امتلأ بالضوضاء. نحن لسنا منصّةً تُلقي عليك المعلومات، بل رفيقُ طريقٍ يأخذ بيدك خطوةً خطوة
          في رحلةٍ إيمانيةٍ منظّمة.
        </p>
        <h2 className="font-display text-2xl mt-6 mb-3">ما يميّزنا</h2>
        <ul className="list-disc pr-6 space-y-1.5">
          <li>محتوى عميقٌ ومُراجَعٌ علميًا ودينيًا.</li>
          <li>تجربةٌ تفاعليّة عبر نظام النقاط والمستويات.</li>
          <li>ربطٌ دائمٌ بين النصّ الشرعي والتطبيق العملي.</li>
          <li>متابعةٌ شخصيةٌ لتقدّمك عبر لوحة الإنجاز.</li>
        </ul>
      </section>

      <OrnamentalDivider />

      <section className="text-center my-12">
        <h2 className="font-display text-2xl mb-6">تواصل معنا</h2>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a
            href="https://www.facebook.com/share/18SsDDgzCr/"
            target="_blank"
            rel="noreferrer"
            className="card-elegant rounded-2xl p-5 w-32 hover:scale-105 transition-transform"
          >
            <Facebook className="h-8 w-8 mx-auto text-[#1877F2] mb-2" />
            <div className="text-sm font-semibold">فيسبوك</div>
          </a>
          <a
            href="https://whatsapp.com/channel/0029VbBZyop2ER6j2w21mo3Z"
            target="_blank"
            rel="noreferrer"
            className="card-elegant rounded-2xl p-5 w-32 hover:scale-105 transition-transform"
          >
            <MessageCircle className="h-8 w-8 mx-auto text-[#25D366] mb-2" />
            <div className="text-sm font-semibold">واتساب</div>
          </a>
          <a
            href="https://t.me/hemmaty_leommati"
            target="_blank"
            rel="noreferrer"
            className="card-elegant rounded-2xl p-5 w-32 hover:scale-105 transition-transform"
          >
            <Send className="h-8 w-8 mx-auto text-[#229ED9] mb-2" />
            <div className="text-sm font-semibold">تليجرام</div>
          </a>
        </div>
      </section>
    </div>
  );
}
