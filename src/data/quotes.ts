export interface Quote {
  text: string;
  source: string;
  type: "ayah" | "hadith" | "wisdom";
}

export const quotes: Quote[] = [
  { text: "إِنَّ مَعَ الْعُسْرِ يُسْرًا", source: "سورة الشرح: 6", type: "ayah" },
  { text: "وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا", source: "سورة الطلاق: 2", type: "ayah" },
  { text: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ", source: "سورة الرعد: 28", type: "ayah" },
  { text: "وَاللَّهُ يُحِبُّ الْمُحْسِنِينَ", source: "سورة آل عمران: 134", type: "ayah" },
  { text: "إنّما الأعمال بالنيّات", source: "صحيح البخاري", type: "hadith" },
  { text: "خير الناس أنفعهم للناس", source: "حديث حسن", type: "hadith" },
  { text: "المؤمن للمؤمن كالبنيان يَشدّ بعضه بعضًا", source: "متفق عليه", type: "hadith" },
  { text: "اعمل لدنياك كأنك تعيش أبدًا، واعمل لآخرتك كأنك تموت غدًا", source: "حِكمة", type: "wisdom" },
  { text: "من ترك شيئًا لله، عوّضه الله خيرًا منه", source: "أثر", type: "wisdom" },
  { text: "لا تَحقِرنّ من المعروف شيئًا، ولو أن تَلقى أخاك بوجهٍ طلق", source: "صحيح مسلم", type: "hadith" },
];

export function getRandomQuote(): Quote {
  return quotes[Math.floor(Math.random() * quotes.length)];
}
