import { useMemo } from "react";

interface DiffPreviewProps {
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
  toolName: string;
}

const FIELD_LABELS: Record<string, string> = {
  title: "العنوان",
  excerpt: "المقتطف",
  content: "المحتوى",
  category: "التصنيف",
  cover_image: "الصورة",
  read_minutes: "دقائق القراءة",
  status: "الحالة",
  scheduled_at: "موعد النشر",
  arabic_text: "النص العربي",
  narrator: "الراوي",
  source: "المصدر",
  explanation: "الشرح",
  benefit: "الفائدة",
  number: "الرقم",
  is_published: "منشور",
  description: "الوصف",
  duration_minutes: "المدة (د)",
  attempt_policy: "سياسة المحاولات",
  is_active: "مفعّل",
  setting_key: "مفتاح الإعداد",
  setting_value: "القيمة",
  publish_datetime: "تاريخ النشر",
  content_type: "نوع المحتوى",
  content_id: "المعرّف",
  action: "الإجراء",
  answer_text: "نص الردّ",
  publish: "نشر",
};

const SKIP_KEYS = new Set([
  "article_id", "hadith_id", "quiz_id", "comment_id", "question_id",
  "id", "created_at", "updated_at", "user_id", "actor_id",
]);

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "نعم" : "لا";
  if (typeof v === "object") {
    try { return JSON.stringify(v).slice(0, 200); } catch { return String(v); }
  }
  const s = String(v);
  return s.length > 200 ? s.slice(0, 200) + "…" : s;
}

export default function DiffPreview({ before, after, toolName }: DiffPreviewProps) {
  const rows = useMemo(() => {
    const isDelete = toolName.startsWith("delete_");
    const keys = new Set<string>();
    if (isDelete && before) {
      // For deletes, show everything that will disappear
      Object.keys(before).forEach((k) => !SKIP_KEYS.has(k) && keys.add(k));
    } else {
      // For updates, show only fields the AI is changing
      Object.keys(after).forEach((k) => !SKIP_KEYS.has(k) && keys.add(k));
    }
    return Array.from(keys).map((k) => {
      const beforeVal = before?.[k];
      const afterVal = isDelete ? null : after[k];
      const changed = isDelete ? true : JSON.stringify(beforeVal ?? null) !== JSON.stringify(afterVal ?? null);
      return { key: k, label: FIELD_LABELS[k] ?? k, before: beforeVal, after: afterVal, changed, isDelete };
    }).filter((r) => r.changed);
  }, [before, after, toolName]);

  if (rows.length === 0) {
    return (
      <div className="text-[11px] text-muted-foreground italic px-1">
        لا تغييرات حقلية للعرض (عملية بدون تعديل بيانات).
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-background/70 overflow-hidden">
      <div className="grid grid-cols-[auto_1fr_1fr] text-[10px] font-semibold bg-muted px-2 py-1 border-b">
        <div className="ps-2">الحقل</div>
        <div className="text-rose-700 dark:text-rose-300">قبل</div>
        <div className="text-emerald-700 dark:text-emerald-300">بعد</div>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {rows.map((r) => (
          <div key={r.key} className="grid grid-cols-[auto_1fr_1fr] text-[11px] border-b last:border-b-0 hover:bg-accent/20">
            <div className="px-2 py-1.5 font-semibold text-muted-foreground border-s">{r.label}</div>
            <div className="px-2 py-1.5 bg-rose-500/5 text-rose-900 dark:text-rose-200 break-words border-s whitespace-pre-wrap">
              {formatValue(r.before)}
            </div>
            <div className="px-2 py-1.5 bg-emerald-500/5 text-emerald-900 dark:text-emerald-200 break-words whitespace-pre-wrap">
              {r.isDelete ? <span className="italic opacity-60">سيُحذف</span> : formatValue(r.after)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
