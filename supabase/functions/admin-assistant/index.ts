import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `أنت "مساعد الإدارة" في موقع "همّتي لأمّتي" — منصة دينية توعوية عربية.

# مهامّك
- مساعدة الأدمن على إدارة الموقع، اقتراح أفكار للمقالات والكويزات والأحاديث، وصياغة محتوى ديني مهذّب ودقيق علميًا (وفق عقيدة أهل السنّة والجماعة).
- تحليل التعليقات والأسئلة وتقديم خطط تطوير وأفكار محتوى أسبوعية.
- اقتراح تحسينات على واجهة الموقع، السيو، التفاعل، والمحتوى.
- صياغة شروحات للأحاديث، فوائد عملية، وأسئلة كويز ذات جودة عالية.

# الأسلوب
- اكتب بالعربية الفصحى المبسطة، ومنسّقة بـ Markdown (## عناوين، قوائم، **عريض**).
- كن دقيقًا ومختصرًا قدر الإمكان.

# قدراتك التنفيذية (Tools)
لديك أدوات تستطيع استخدامها مباشرة لإنشاء محتوى في الموقع:
- create_article: لإنشاء مقال (يبدأ كمسودّة افتراضيًا حتى يراجعه الأدمن).
- create_hadith: لإضافة حديث جديد.
- create_quiz: لإنشاء اختبار جديد مع أسئلته (يبقى غير مفعّل حتى يفعّله الأدمن).
- broadcast_notification: لإرسال إشعار لكل مستخدمي الموقع.
- get_site_stats: للاطلاع على إحصاءات الموقع وعدد المستخدمين والمحتوى.
- list_recent_questions: لعرض آخر الأسئلة المُرسَلة من المستخدمين.

# قواعد استخدام الأدوات
- لا تنفّذ أمرًا تخريبيًا (حذف) — اطلب من الأدمن فعله من اللوحة.
- لو طلب الأدمن "اقترح" أو "صمّم" فقط: أعرض المسودّة في الردّ ولا تستدعِ أداة.
- لو طلب الأدمن "أنشئ / احفظ / ارفع" فاستدعِ الأداة المناسبة وأرفق ملخّصًا للنتيجة.
- إذا أنشأت مقالًا، اجعله "draft" دائمًا حتى يراجعه الأدمن.
- إذا أنشأت كويزًا، اتركه is_active=false حتى يفعّله الأدمن.
- اذكر في ردّك ID العنصر الذي أنشأته ورابطه إن أمكن.

# اختصارات شائعة
- "أنشئ كويز جديد" → اطلب الموضوع وعدد الأسئلة ثم استخدم create_quiz.
- "صمّم مقال كامل" → ولّد المحتوى بالماركداون ثم استدعِ create_article كمسودّة.
- "قيّم التعليقات" → استدعِ get_site_stats واستعرض الإحصاءات.
- "خطّة محتوى أسبوعية" → اكتبها كقائمة منظّمة (سبت..جمعة) بدون استدعاء أداة.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "create_article",
      description: "إنشاء مقال جديد في الموقع (يُحفظ كمسودّة افتراضيًا).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "عنوان المقال" },
          slug: { type: "string", description: "رابط فريد بالأحرف الإنجليزية الصغيرة (مثال: hemma-fi-ramadan)" },
          excerpt: { type: "string", description: "ملخّص قصير 1-2 جملة" },
          content: { type: "string", description: "المحتوى الكامل بصيغة Markdown" },
          category: { type: "string" },
          read_minutes: { type: "number" },
          status: { type: "string", enum: ["draft", "published"], description: "افتراضيًا draft" },
        },
        required: ["title", "slug", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_hadith",
      description: "إضافة حديث نبوي جديد مع شرحه وفائدته.",
      parameters: {
        type: "object",
        properties: {
          arabic_text: { type: "string" },
          narrator: { type: "string" },
          source: { type: "string", description: "التخريج، مثال: رواه البخاري ومسلم" },
          explanation: { type: "string" },
          benefit: { type: "string" },
          category: { type: "string" },
          number: { type: "number", description: "اختياري — يُحسب تلقائيًا" },
        },
        required: ["arabic_text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_quiz",
      description: "إنشاء اختبار جديد مع أسئلته (يبقى غير مفعّل حتى يفعّله الأدمن).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          duration_minutes: { type: "number" },
          attempt_policy: { type: "string", enum: ["strict_single", "resume_allowed"] },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question_text: { type: "string" },
                question_type: { type: "string", enum: ["mcq", "essay"] },
                options: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { text: { type: "string" } },
                    required: ["text"],
                  },
                },
                correct_index: { type: "number" },
                points: { type: "number" },
              },
              required: ["question_text"],
            },
          },
        },
        required: ["title", "questions"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "broadcast_notification",
      description: "إرسال إشعار داخل الموقع لكل المستخدمين.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          message: { type: "string" },
          link: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_site_stats",
      description: "إحصاءات الموقع: عدد المستخدمين، المقالات، الأسئلة، الاختبارات، التعليقات.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_recent_questions",
      description: "عرض آخر 10 أسئلة من المستخدمين (المنشور وغير المنشور).",
      parameters: { type: "object", properties: {} },
    },
  },
];

interface SupabaseClient {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  from: (table: string) => {
    select: (cols?: string, opts?: { count?: string; head?: boolean }) => {
      order?: (col: string, opts?: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: unknown; error: { message: string } | null }> };
      limit?: (n: number) => Promise<{ data: unknown; error: { message: string } | null }>;
      then?: never;
    } & Promise<{ count?: number; data?: unknown; error?: { message: string } | null }>;
  };
}

async function executeTool(name: string, args: Record<string, unknown>, supabase: SupabaseClient) {
  try {
    if (name === "create_article") {
      const payload = { ...args, status: args.status || "draft" };
      const { data, error } = await supabase.rpc("admin_create_article", { _payload: payload });
      if (error) return { success: false, error: error.message };
      return { success: true, id: data, message: "تم إنشاء المقال كمسودّة" };
    }
    if (name === "create_hadith") {
      const { data, error } = await supabase.rpc("admin_create_hadith", { _payload: args });
      if (error) return { success: false, error: error.message };
      return { success: true, id: data, message: "تمت إضافة الحديث" };
    }
    if (name === "create_quiz") {
      const payload = { ...args, is_active: false };
      const { data, error } = await supabase.rpc("admin_create_quiz_with_questions", { _payload: payload });
      if (error) return { success: false, error: error.message };
      return { success: true, id: data, message: "تم إنشاء الاختبار (غير مفعّل)" };
    }
    if (name === "broadcast_notification") {
      const { data, error } = await supabase.rpc("admin_broadcast_notification", {
        _title: args.title,
        _message: args.message ?? null,
        _link: args.link ?? null,
      });
      if (error) return { success: false, error: error.message };
      return { success: true, recipients: data, message: `أُرسل لـ ${data} مستخدم` };
    }
    if (name === "get_site_stats") {
      const sb = supabase as unknown as { from: (t: string) => { select: (c: string, o: { count: string; head: boolean }) => Promise<{ count: number | null }> } };
      const [users, articles, hadiths, quizzes, questions, comments] = await Promise.all([
        sb.from("profiles").select("*", { count: "exact", head: true }),
        sb.from("articles").select("*", { count: "exact", head: true }),
        sb.from("hadiths").select("*", { count: "exact", head: true }),
        sb.from("quizzes").select("*", { count: "exact", head: true }),
        sb.from("user_questions").select("*", { count: "exact", head: true }),
        sb.from("article_comments").select("*", { count: "exact", head: true }),
      ]);
      return {
        success: true,
        stats: {
          users: users.count ?? 0,
          articles: articles.count ?? 0,
          hadiths: hadiths.count ?? 0,
          quizzes: quizzes.count ?? 0,
          questions: questions.count ?? 0,
          comments: comments.count ?? 0,
        },
      };
    }
    if (name === "list_recent_questions") {
      const sb = supabase as unknown as { from: (t: string) => { select: (c: string) => { order: (col: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: unknown[] | null }> } } } };
      const { data } = await sb.from("user_questions")
        .select("id, question, answer, is_published, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      return { success: true, questions: data ?? [] };
    }
    return { success: false, error: "أداة غير معروفة" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "خطأ غير معروف" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY غير مهيّأ" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    }) as unknown as SupabaseClient;

    // Auth + admin guard
    const sbAuth = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await sbAuth.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "غير مسجّل" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roles } = await sbAuth.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = roles?.some((r: { role: string }) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "غير مصرّح" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, allow_tools } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages مطلوب" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tool-calling loop (non-streaming for safety)
    const conversation: Array<Record<string, unknown>> = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    let toolCallsExecuted: Array<{ name: string; args: unknown; result: unknown }> = [];

    for (let iter = 0; iter < 5; iter++) {
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: conversation,
          ...(allow_tools !== false ? { tools: TOOLS, tool_choice: "auto" } : {}),
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) {
          return new Response(JSON.stringify({ error: "تجاوزت الحد المسموح، حاول لاحقًا" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResp.status === 402) {
          return new Response(JSON.stringify({ error: "نفدت أرصدة Lovable AI" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await aiResp.text();
        console.error("AI gateway error:", aiResp.status, t);
        return new Response(JSON.stringify({ error: "خطأ في بوّابة الذكاء الاصطناعي" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await aiResp.json();
      const choice = data.choices?.[0];
      const msg = choice?.message;
      if (!msg) {
        return new Response(JSON.stringify({ error: "ردّ فارغ" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const toolCalls = msg.tool_calls as Array<{ id: string; function: { name: string; arguments: string } }> | undefined;

      if (!toolCalls || toolCalls.length === 0) {
        // Final answer
        return new Response(
          JSON.stringify({
            content: msg.content ?? "",
            tool_calls_executed: toolCallsExecuted,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Execute each tool call
      conversation.push(msg);
      for (const tc of toolCalls) {
        let parsed: Record<string, unknown> = {};
        try { parsed = JSON.parse(tc.function.arguments); } catch { /* ignore */ }
        const result = await executeTool(tc.function.name, parsed, supabase);
        toolCallsExecuted.push({ name: tc.function.name, args: parsed, result });
        conversation.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }

    return new Response(
      JSON.stringify({ content: "تجاوزت عدد محاولات استدعاء الأدوات", tool_calls_executed: toolCallsExecuted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("admin-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير معروف" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
