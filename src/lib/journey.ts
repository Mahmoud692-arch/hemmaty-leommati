export interface Level {
  level: number;
  title: string;
  subtitle: string;
  themes: string[];
  minPoints: number;
}

export const LEVELS: Level[] = [
  {
    level: 1,
    title: "مبتدئ الهمة",
    subtitle: "بداية الطريق نحو العلم والعمل",
    themes: ["الاستمرارية", "بناء عادة التعلم", "البدء بفعل الخير"],
    minPoints: 0,
  },
  {
    level: 2,
    title: "صاحب همة",
    subtitle: "همة متجددة في طلب الخير",
    themes: ["المثابرة", "إكمال الأهداف", "مشاركة الفائدة"],
    minPoints: 2000,
  },
  {
    level: 3,
    title: "طالب علم",
    subtitle: "حب العلم والمتابعة الحثيثة",
    themes: ["القراءة", "التأمل", "السعي لفهم الحكمة"],
    minPoints: 8000,
  },
  {
    level: 4,
    title: "داعية صاعد",
    subtitle: "بداية التأثير بالدعوة الحسنة",
    themes: ["القدوة الحسنة", "نشر الخير", "الحديث الحسن"],
    minPoints: 20000,
  },
  {
    level: 5,
    title: "سفير الأمة",
    subtitle: "حامل رسالة المجتمع والإسلام",
    themes: ["المشاركة المجتمعية", "التواصل البناء", "العمل الخيري"],
    minPoints: 40000,
  },
  {
    level: 6,
    title: "رائد المعرفة",
    subtitle: "قيادة المعرفة ونشرها بجدارة",
    themes: ["التعليم", "الإرشاد", "التوثيق"],
    minPoints: 75000,
  },
  {
    level: 7,
    title: "حامل المشكاة",
    subtitle: "نور يُضيء دروب الآخرين",
    themes: ["الإشعاع العلمي", "الاستمرارية في الخير", "حب المصلحة"],
    minPoints: 130000,
  },
  {
    level: 8,
    title: "ناشر الخير",
    subtitle: "الخير يصل للجميع بفضلك",
    themes: ["المبادرات", "الدعوة بالعمل الصالح", "التشجيع"],
    minPoints: 220000,
  },
  {
    level: 9,
    title: "إمام الملتقى",
    subtitle: "قائد بأخلاقه وعلمه",
    themes: ["القيادة الروحية", "المشورة", "ترسيخ المبادئ"],
    minPoints: 360000,
  },
  {
    level: 10,
    title: "وارث الأنبياء",
    subtitle: "سيرة الهداة في قلبك وعملك",
    themes: ["التخلق بأخلاق الأنبياء", "الصلابة في الحق", "التضحية"],
    minPoints: 580000,
  },
  {
    level: 11,
    title: "صانع الأثر",
    subtitle: "ترك بصمة فعالة في حياة الناس",
    themes: ["الإبداع في الدعوة", "التأثير المستدام", "الاستمرارية"],
    minPoints: 940000,
  },
  {
    level: 12,
    title: "عماد الأمة",
    subtitle: "مناراتُ الأمة وثقتها",
    themes: ["الثقة", "التميز في العمل", "الاستقامة"],
    minPoints: 1520000,
  },
  {
    level: 13,
    title: "المخلص",
    subtitle: "الإخلاص في القول والعمل",
    themes: ["النقاء", "الصدق", "الثبات"],
    minPoints: 2460000,
  },
  {
    level: 14,
    title: "الصدّيق",
    subtitle: "الصاحب للحق في كل حال",
    themes: ["الثبات على الحق", "الشفافية", "الإيثار"],
    minPoints: 3980000,
  },
  {
    level: 15,
    title: "خادم الأمة",
    subtitle: "خدمة الأمة بكل إخلاص وتفانٍ",
    themes: ["البذل", "الوفاء", "العمل من أجل الناس"],
    minPoints: 6440000,
  },
];

export function getLevel(points: number): Level {
  return [...LEVELS].reverse().find((l) => points >= l.minPoints) ?? LEVELS[0];
}

export function getNextLevel(points: number): Level | null {
  return LEVELS.find((l) => l.minPoints > points) ?? null;
}

export function getLevelProgress(points: number): number {
  const cur = getLevel(points);
  const next = getNextLevel(points);
  if (!next) return 100;
  const range = next.minPoints - cur.minPoints;
  return Math.min(100, Math.round(((points - cur.minPoints) / range) * 100));
}

export const BADGES: Record<string, { title: string; description: string; icon: string }> = {
  first_article: { title: "أول قراءة", description: "قرأت أول مقال", icon: "📖" },
  five_articles: { title: "قارئ نشط", description: "قرأت 5 مقالات", icon: "🌟" },
  first_hadith: { title: "طالب علم", description: "قرأت أول حديث", icon: "📜" },
  ten_hadiths: { title: "محبّ السنة", description: "قرأت 10 أحاديث", icon: "🕌" },
  level_2: { title: "ملتزم", description: "وصلت للمستوى الثاني", icon: "🌙" },
  level_3: { title: "ثابت", description: "وصلت للمستوى الثالث", icon: "✨" },
  level_4: { title: "داعية", description: "وصلت للمستوى الرابع", icon: "🏆" },
};

export const POINTS = {
  ARTICLE_READ: 10,
  HADITH_READ: 5,
  QUIZ_PASSED: 20,
};
