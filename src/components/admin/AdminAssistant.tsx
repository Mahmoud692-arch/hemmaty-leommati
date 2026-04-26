import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Trash2, User, Bot, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "اقترح ٥ أفكار لمقالات جديدة عن الهمّة في رمضان",
  "اكتب لي حديثًا مع شرحه وفائدته العملية",
  "صمّم لي اختبار من ٥ أسئلة عن أركان الإسلام",
  "ما الإحصاءات التي يجب متابعتها لقياس نجاح الموقع؟",
  "اقترح تحسينات لتجربة المستخدم في صفحة المقالات",
];

export default function AdminAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("ai_assistant_messages")
        .select("role, content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(50);
      setMessages(((data ?? []) as Msg[]).filter((m) => m.role !== "system" as never));
      setHistoryLoaded(true);
    })();
  }, [user?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const persist = async (role: "user" | "assistant", content: string) => {
    if (!user) return;
    await supabase.from("ai_assistant_messages").insert({ user_id: user.id, role, content });
  };

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages((p) => [...p, userMsg, { role: "assistant", content: "" }]);
    persist("user", userMsg.content);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-assistant`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].slice(-20).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("تجاوزت الحدّ المسموح، حاول لاحقًا");
        else if (resp.status === 402) toast.error("نفدت أرصدة الذكاء الاصطناعي");
        else toast.error("تعذّر الاتصال بالمساعد");
        setMessages((p) => p.slice(0, -1));
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let assistantSoFar = "";
      let done = false;

      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assistantSoFar += delta;
              setMessages((p) => {
                const copy = [...p];
                copy[copy.length - 1] = { role: "assistant", content: assistantSoFar };
                return copy;
              });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
      if (assistantSoFar) persist("assistant", assistantSoFar);
    } catch (e) {
      console.error(e);
      toast.error("خطأ في الاتصال");
      setMessages((p) => p.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    if (!confirm("مسح كل المحادثة؟")) return;
    await supabase.from("ai_assistant_messages").delete().eq("user_id", user.id);
    setMessages([]);
    toast.success("تم المسح");
  };

  return (
    <div className="rounded-2xl border bg-card flex flex-col h-[70vh]">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[var(--gold)]" />
          <div>
            <div className="font-semibold">مساعد الإدارة الذكي</div>
            <div className="text-[11px] text-muted-foreground">مدعوم بنماذج Gemini عبر Lovable AI</div>
          </div>
        </div>
        {messages.length > 0 && (
          <Button size="sm" variant="ghost" onClick={clearHistory}>
            <Trash2 className="h-3 w-3 ml-1" /> مسح
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {historyLoaded && messages.length === 0 && (
          <div className="text-center py-6">
            <Bot className="h-12 w-12 mx-auto text-[var(--gold)] mb-2 opacity-70" />
            <p className="text-sm text-muted-foreground mb-4">ابدأ محادثة مع المساعد. اطلب أفكارًا، حلّل، أو استشره.</p>
            <div className="grid gap-2 max-w-md mx-auto">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  className="text-right text-xs px-3 py-2 rounded-lg border hover:bg-accent/50 flex items-center gap-2"
                >
                  <Lightbulb className="h-3 w-3 text-[var(--gold)] shrink-0" />
                  <span>{s}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-[var(--gold)]/20 text-[var(--gold)]"}`}>
              {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {m.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_h2]:mt-3 [&_h2]:mb-1">
                  <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{m.content}</div>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="p-3 border-t">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="اسأل أو اطلب اقتراحًا… (Enter للإرسال، Shift+Enter لسطر جديد)"
            rows={2}
            className="resize-none"
            disabled={loading}
          />
          <Button onClick={() => send(input)} disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
