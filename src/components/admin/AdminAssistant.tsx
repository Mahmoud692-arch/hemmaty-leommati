import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles, Send, Trash2, User, Bot, Wand2, Megaphone, BookPlus,
  ScrollText, Trophy, BarChart3, ListChecks, FileText, Loader2, Zap,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import DiffPreview from "./DiffPreview";

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result: { success: boolean; id?: string; error?: string; message?: string; recipients?: number; stats?: Record<string, number>; questions?: unknown[] };
}

interface PendingOp {
  name: string;
  args: Record<string, unknown>;
  before?: Record<string, unknown> | null;
}

interface Msg {
  role: "user" | "assistant" | "system";
  content: string;
  tool_calls_executed?: ToolCall[];
  pending_confirmation?: PendingOp[];
}

const QUICK_ACTIONS = [
  { icon: BookPlus, label: "أنشئ كويز جديد", prompt: "أنشئ كويزًا جديدًا (5 أسئلة اختيار من متعدد) عن أركان الإسلام واحفظه في الموقع. اعرض لي ملخّصًا قبل الحفظ ثم نفّذ." },
  { icon: FileText, label: "صمّم مقالًا كاملًا", prompt: "صمّم مقالًا كاملًا عن «الهمّة العالية في رمضان» (800-1200 كلمة بالماركداون) ثم احفظه كمسودّة في الموقع. أعرضه لي قبل الحفظ." },
  { icon: ScrollText, label: "أضف حديثًا مع شرحه", prompt: "اقترح حديثًا نبويًا صحيحًا مع شرحه وفائدته العملية، ثم أضفه إلى قاعدة الأحاديث." },
  { icon: BarChart3, label: "إحصاءات الموقع", prompt: "اعرض لي أحدث إحصاءات الموقع." },
  { icon: ListChecks, label: "قيّم آخر الأسئلة", prompt: "اعرض آخر 10 أسئلة من المستخدمين، صنّفها حسب الموضوع، واقترح إجابات مختصرة لكل واحدة." },
  { icon: Megaphone, label: "خطّة محتوى أسبوعية", prompt: "اقترح خطّة محتوى لمدة أسبوع كامل (سبت إلى جمعة): مقال، حديث، اقتباس، وكويز لكل يوم. اجعلها قابلة للتنفيذ." },
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
      const filtered = ((data ?? []) as { role: string; content: string }[])
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      setMessages(filtered);
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

  const callAssistant = async (
    convo: Msg[],
    opts: { confirmed?: boolean } = {}
  ) => {
    const { data: { session } } = await supabase.auth.getSession();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-assistant`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify({
        messages: convo.slice(-20).map((m) => ({ role: m.role, content: m.content })),
        confirmed: opts.confirmed === true,
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) toast.error("تجاوزت الحدّ المسموح، حاول لاحقًا");
      else if (resp.status === 402) toast.error("نفدت أرصدة الذكاء الاصطناعي");
      else toast.error("تعذّر الاتصال بالمساعد");
      return null;
    }

    return await resp.json() as {
      content: string;
      tool_calls_executed?: ToolCall[];
      pending_confirmation?: PendingOp[];
    };
  };

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    persist("user", userMsg.content);
    setLoading(true);

    try {
      const data = await callAssistant(next);
      if (!data) return;

      const aMsg: Msg = {
        role: "assistant",
        content: data.content || "",
        tool_calls_executed: data.tool_calls_executed,
        pending_confirmation: data.pending_confirmation,
      };
      setMessages((p) => [...p, aMsg]);
      if (aMsg.content) persist("assistant", aMsg.content);

      data.tool_calls_executed?.forEach((tc) => {
        if (tc.result.success) toast.success(`✅ ${tc.name}: ${tc.result.message ?? "تمّ"}`);
        else toast.error(`❌ ${tc.name}: ${tc.result.error ?? "خطأ"}`);
      });
    } catch (e) {
      console.error(e);
      toast.error("خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  const confirmPending = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Replay last conversation with confirmed=true
      const convo = [...messages, { role: "user" as const, content: "نفّذ" }];
      const data = await callAssistant(convo, { confirmed: true });
      if (!data) return;
      const aMsg: Msg = {
        role: "assistant",
        content: data.content || "",
        tool_calls_executed: data.tool_calls_executed,
      };
      // Remove pending from previous message and append result
      setMessages((prev) => {
        const trimmed = prev.map((m) => ({ ...m, pending_confirmation: undefined }));
        return [...trimmed, { role: "user", content: "نفّذ" }, aMsg];
      });
      persist("user", "نفّذ");
      if (aMsg.content) persist("assistant", aMsg.content);
      data.tool_calls_executed?.forEach((tc) => {
        if (tc.result.success) toast.success(`✅ ${tc.name}: ${tc.result.message ?? "تمّ"}`);
        else toast.error(`❌ ${tc.name}: ${tc.result.error ?? "خطأ"}`);
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelPending = () => {
    setMessages((prev) => prev.map((m) => ({ ...m, pending_confirmation: undefined })));
    toast.info("تم إلغاء العملية");
  };

  const clearHistory = async () => {
    if (!user) return;
    if (!confirm("مسح كل المحادثة؟")) return;
    await supabase.from("ai_assistant_messages").delete().eq("user_id", user.id);
    setMessages([]);
    toast.success("تم المسح");
  };

  return (
    <div className="rounded-2xl border bg-card flex flex-col h-[75vh]">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Sparkles className="h-5 w-5 text-[var(--gold)]" />
            <Zap className="h-2.5 w-2.5 text-emerald-500 absolute -bottom-0.5 -end-0.5" />
          </div>
          <div>
            <div className="font-semibold flex items-center gap-2">
              مساعد الإدارة الذكي
              <span className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
                تنفيذي
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              مدعوم بـ Gemini · يستطيع إنشاء محتوى وتنفيذ مهامّ في الموقع
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <Button size="sm" variant="ghost" onClick={clearHistory}>
            <Trash2 className="h-3 w-3 ms-1" /> مسح
          </Button>
        )}
      </div>

      {/* Quick actions */}
      <div className="p-3 border-b bg-muted/30">
        <div className="text-[11px] text-muted-foreground mb-2 flex items-center gap-1">
          <Wand2 className="h-3 w-3" /> أوامر جاهزة
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {QUICK_ACTIONS.map((a, i) => {
            const Icon = a.icon;
            return (
              <button
                key={i}
                disabled={loading}
                onClick={() => send(a.prompt)}
                className="text-right text-xs px-2.5 py-2 rounded-lg border bg-background hover:bg-accent/50 disabled:opacity-50 flex items-center gap-2"
              >
                <Icon className="h-3.5 w-3.5 text-[var(--gold)] shrink-0" />
                <span className="truncate">{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {historyLoaded && messages.length === 0 && (
          <div className="text-center py-6">
            <Bot className="h-12 w-12 mx-auto text-[var(--gold)] mb-2 opacity-70" />
            <p className="text-sm text-muted-foreground">
              ابدأ محادثة، أو اختر أمرًا جاهزًا من الأعلى.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              يستطيع المساعد إنشاء مقالات وكويزات وأحاديث وإرسال إشعارات بأمر منك.
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-[var(--gold)]/20 text-[var(--gold)]"}`}>
              {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {m.role === "assistant" ? (
                <>
                  {m.content && (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_h2]:mt-3 [&_h2]:mb-1">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  )}
                  {m.tool_calls_executed && m.tool_calls_executed.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {m.tool_calls_executed.map((tc, j) => (
                        <div
                          key={j}
                          className={`text-xs rounded-lg px-2 py-1.5 border ${
                            tc.result.success
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                              : "bg-destructive/10 border-destructive/30 text-destructive"
                          }`}
                        >
                          <div className="font-semibold flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {tc.name}
                          </div>
                          <div className="opacity-80 mt-0.5">
                            {tc.result.success
                              ? tc.result.message ?? (tc.result.stats ? JSON.stringify(tc.result.stats) : "تمّ التنفيذ")
                              : tc.result.error}
                          </div>
                          {tc.result.id && (
                            <div className="text-[10px] opacity-60 mt-0.5 font-mono">ID: {tc.result.id}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {m.pending_confirmation && m.pending_confirmation.length > 0 && (
                    <div className="mt-3 rounded-lg border-2 border-amber-500/50 bg-amber-500/10 p-3 space-y-3">
                      <div className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                        ⚠️ عملية حسّاسة — راجع التغييرات قبل التأكيد
                      </div>
                      {m.pending_confirmation.map((op, k) => (
                        <div key={k} className="space-y-1.5">
                          <div className="text-[11px] bg-background/70 rounded px-2 py-1 font-mono flex items-center gap-2">
                            <span className="text-amber-700 dark:text-amber-300 font-bold">{op.name}</span>
                            {Object.entries(op.args)
                              .filter(([k]) => k.endsWith("_id") || k === "setting_key" || k === "content_id")
                              .slice(0, 1)
                              .map(([k, v]) => (
                                <span key={k} className="opacity-70 text-[10px]">
                                  {k}: <span dir="ltr">{String(v).slice(0, 36)}</span>
                                </span>
                              ))}
                          </div>
                          <DiffPreview
                            toolName={op.name}
                            before={op.before ?? null}
                            after={op.args}
                          />
                        </div>
                      ))}
                      <div className="flex gap-2 pt-1 border-t border-amber-500/30">
                        <Button size="sm" onClick={confirmPending} disabled={loading} className="h-7 text-xs">
                          ✓ نفّذ التغييرات
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelPending} disabled={loading} className="h-7 text-xs">
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="whitespace-pre-wrap">{m.content}</div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="shrink-0 w-7 h-7 rounded-full bg-[var(--gold)]/20 text-[var(--gold)] flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-muted rounded-2xl px-4 py-2 text-sm flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-xs">يفكّر…</span>
            </div>
          </div>
        )}
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
            placeholder="اطلب من المساعد… (مثل: أنشئ مقالًا عن الصبر واحفظه)"
            rows={2}
            className="resize-none"
            disabled={loading}
          />
          <Button onClick={() => send(input)} disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          ⚠️ راجع كل محتوى أنشأه المساعد قبل النشر — لا يحذف بل يضيف فقط.
        </p>
      </div>
    </div>
  );
}
