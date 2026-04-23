import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import OrnamentalDivider from "@/components/OrnamentalDivider";
import { MessageCircleQuestion, ShieldCheck } from "lucide-react";
import { z } from "zod";

interface PublicQuestion {
  id: string;
  question: string;
  answer: string | null;
  is_anonymous: boolean;
  answered_at: string | null;
  created_at: string;
}

export const Route = createFileRoute("/questions")({
  head: () => ({
    meta: [
      { title: "أسئلة المستخدمين — هِمَّتي لِأمّتي" },
      {
        name: "description",
        content: "اطرح سؤالك الديني أو الحياتي وتلقّى ردًّا موثوقًا من إدارة الموقع.",
      },
    ],
  }),
  component: QuestionsPage,
});

const schema = z.object({
  question: z.string().trim().min(10, "السؤال قصير جدًا").max(2000, "السؤال طويل جدًا"),
});

function QuestionsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<PublicQuestion[]>([]);
  const [text, setText] = useState("");
  const [anon, setAnon] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("user_questions")
      .select("id, question, answer, is_anonymous, answered_at, created_at")
      .eq("is_published", true)
      .order("answered_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setItems((data as PublicQuestion[]) ?? []));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.info("سجّل دخولك أوّلًا");
      return;
    }
    const parsed = schema.safeParse({ question: text });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "سؤال غير صالح");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("user_questions").insert({
      user_id: user.id,
      question: parsed.data.question,
      is_anonymous: anon,
    });
    setLoading(false);
    if (error) {
      toast.error("تعذّر إرسال السؤال");
      return;
    }
    toast.success("تم استلام سؤالك، ستتمّ مراجعته 💚");
    setText("");
    setAnon(false);
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="text-center">
        <MessageCircleQuestion className="h-12 w-12 mx-auto text-[var(--gold)] mb-3" />
        <h1 className="font-display text-4xl mb-3">أسئلة المستخدمين</h1>
        <p className="text-muted-foreground">
          اطرح سؤالك ولن يُنشر إلا بعد مراجعة الإدارة والإجابة عليه.
        </p>
        <OrnamentalDivider />
      </div>

      {user ? (
        <form onSubmit={submit} className="card-elegant rounded-2xl p-6 my-8">
          <h2 className="font-display text-xl mb-3">اطرح سؤالك</h2>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="اكتب سؤالك بأدبٍ ووضوح..."
            rows={5}
            maxLength={2000}
          />
          <div className="flex items-center gap-2 mt-3">
            <Checkbox id="anon" checked={anon} onCheckedChange={(v) => setAnon(!!v)} />
            <label htmlFor="anon" className="text-sm cursor-pointer">
              إخفاء هويتي
            </label>
          </div>
          <Button type="submit" disabled={loading} className="mt-4">
            {loading ? "جاري الإرسال..." : "إرسال السؤال"}
          </Button>
        </form>
      ) : (
        <div className="card-elegant rounded-2xl p-6 my-8 text-center">
          <p className="text-muted-foreground mb-3">سجّل دخولك لطرح سؤال.</p>
          <Link to="/auth">
            <Button>تسجيل الدخول</Button>
          </Link>
        </div>
      )}

      <h2 className="font-display text-2xl mb-4 mt-10 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-[var(--gold)]" /> أسئلة وأجوبة منشورة
      </h2>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">لا توجد أسئلة منشورة بعد.</p>
      ) : (
        <div className="space-y-4">
          {items.map((q) => (
            <div key={q.id} className="card-elegant rounded-2xl p-5">
              <div className="text-sm text-muted-foreground mb-2">سؤال:</div>
              <p className="font-semibold mb-3">{q.question}</p>
              {q.answer && (
                <>
                  <div className="text-sm text-[var(--gold)] mb-1">الإجابة:</div>
                  <p className="text-foreground/90 leading-relaxed whitespace-pre-line">
                    {q.answer}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
