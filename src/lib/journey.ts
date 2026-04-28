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
    title: "البداية",
    subtitle: "الصلاة والتوبة",
    themes: ["إقامة الفرائض", "الإقلاع عن الذنوب", "بناء العادات"],
    minPoints: 0,
  },
  {
    level: 2,
    title: "الالتزام",
    subtitle: "الصحبة والقرآن",
    themes: ["وِرد قرآني يومي", "صحبة صالحة", "حضور مجالس العلم"],
    minPoints: 500,
  },
  {
    level: 3,
    title: "الثبات",
    subtitle: "الإخلاص والصبر",
    themes: ["تنقية النية", "الصبر على البلاء", "ذكر الله الكثير"],
    minPoints: 1000,
  },
  {
    level: 4,
    title: "التأثير",
    subtitle: "الدعوة وإصلاح النفس",
    themes: ["الدعوة بالقدوة", "نفع الناس", "إصلاح من حولك"],
    minPoints: 2000,
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
