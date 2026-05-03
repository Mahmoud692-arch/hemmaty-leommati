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
لديك مجموعة أدوات للقراءة والإنشاء والتعديل والحذف والجدولة والمراجعة والإعدادات والإحصاءات:
- إنشاء: create_article, create_hadith, create_quiz, broadcast_notification
- تعديل: update_article, update_hadith, update_quiz, edit_site_setting, schedule_content
- حذف: delete_article, delete_hadith, delete_quiz (تتطلب تأكيدًا)
- مراجعة: list_comments, moderate_comment, respond_to_question
- استعلام/إحصاء: get_site_stats, list_recent_questions, get_user_info, get_article_performance, get_quiz_performance

# قواعد الأمان والموافقة (مهمّ جدًا)
- العمليات الحساسة (نشر، حذف، تفعيل كويز، رد منشور للمستخدم، تعديل إعدادات، جدولة، موافقة على تعليق)
  تتطلب علم الأدمن: 
  • إذا لم يحدد الأدمن بوضوح "نفّذ/احذف/انشر/فعّل" فاطلب تأكيدًا قبل استدعاء الأداة، 
  • وقدّم ملخّصًا واضحًا لما ستفعله.
- إذا أنشأت مقالًا، اجعله "draft" دائمًا حتى يراجعه الأدمن.
- إذا أنشأت كويزًا، اتركه is_active=false حتى يفعّله الأدمن.
- لا تنشر ردودًا للمستخدمين تلقائيًا، احفظها كمسودّة (publish=false) إلا إذا طلب الأدمن صراحةً النشر.
- اذكر في ردّك ID العنصر الذي أنشأته/عدّلته.

# اختصارات شائعة
- "أنشئ كويز جديد" → اطلب الموضوع وعدد الأسئلة ثم استخدم create_quiz.
- "صمّم مقال كامل" → ولّد المحتوى بالماركداون ثم استدعِ create_article كمسودّة.
- "خطّة محتوى أسبوعية" → اكتبها كقائمة منظّمة (سبت..جمعة) بدون استدعاء أداة.`;

const TOOLS = [
  // ============ إنشاء ============
  {
    type: "function",
    function: {
      name: "create_article",
      description: "إنشاء مقال جديد (يُحفظ كمسودّة افتراضيًا).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          slug: { type: "string", description: "بالأحرف الإنجليزية الصغيرة، مثال: hemma-fi-ramadan" },
          excerpt: { type: "string" },
          content: { type: "string", description: "Markdown" },
          category: { type: "string" },
          read_minutes: { type: "number" },
          status: { type: "string", enum: ["draft", "published"] },
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
          source: { type: "string" },
          explanation: { type: "string" },
          benefit: { type: "string" },
          category: { type: "string" },
          number: { type: "number" },
        },
        required: ["arabic_text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_quiz",
      description: "إنشاء اختبار جديد مع أسئلته (غير مفعّل).",
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
                options: { type: "array", items: { type: "object", properties: { text: { type: "string" } }, required: ["text"] } },
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
  // ============ تعديل ============
  {
    type: "function",
    function: {
      name: "update_article",
      description: "تعديل مقال موجود. النشر يحتاج تأكيد الأدمن.",
      parameters: {
        type: "object",
        properties: {
          article_id: { type: "string" },
          title: { type: "string" },
          excerpt: { type: "string" },
          content: { type: "string" },
          category: { type: "string" },
          cover_image: { type: "string" },
          read_minutes: { type: "number" },
          status: { type: "string", enum: ["draft", "published", "scheduled"] },
        },
        required: ["article_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_hadith",
      description: "تعديل حديث موجود.",
      parameters: {
        type: "object",
        properties: {
          hadith_id: { type: "string" },
          arabic_text: { type: "string" },
          narrator: { type: "string" },
          source: { type: "string" },
          explanation: { type: "string" },
          benefit: { type: "string" },
          category: { type: "string" },
          number: { type: "number" },
        },
        required: ["hadith_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_quiz",
      description: "تعديل كويز. التفعيل (is_active=true) يحتاج تأكيد الأدمن.",
      parameters: {
        type: "object",
        properties: {
          quiz_id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          duration_minutes: { type: "number" },
          attempt_policy: { type: "string", enum: ["strict_single", "resume_allowed"] },
          is_active: { type: "boolean" },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question_text: { type: "string" },
                question_type: { type: "string", enum: ["mcq", "essay"] },
                options: { type: "array", items: { type: "object" } },
                correct_index: { type: "number" },
                points: { type: "number" },
              },
              required: ["question_text"],
            },
          },
        },
        required: ["quiz_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_site_setting",
      description: "تعديل إعداد عام للموقع (يحتاج تأكيد).",
      parameters: {
        type: "object",
        properties: {
          setting_key: { type: "string" },
          setting_value: { type: "string", description: "قيمة JSON أو نص" },
        },
        required: ["setting_key", "setting_value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_content",
      description: "جدولة نشر مقال أو كويز في وقت لاحق (تحتاج تأكيد).",
      parameters: {
        type: "object",
        properties: {
          content_type: { type: "string", enum: ["article", "quiz"] },
          content_id: { type: "string" },
          publish_datetime: { type: "string", description: "ISO 8601" },
        },
        required: ["content_type", "content_id", "publish_datetime"],
      },
    },
  },
  // ============ حذف ============
  {
    type: "function",
    function: {
      name: "delete_article",
      description: "حذف مقال نهائيًا (يحتاج تأكيد صريح من الأدمن).",
      parameters: {
        type: "object",
        properties: { article_id: { type: "string" } },
        required: ["article_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_hadith",
      description: "حذف حديث نهائيًا (يحتاج تأكيد).",
      parameters: {
        type: "object",
        properties: { hadith_id: { type: "string" } },
        required: ["hadith_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_quiz",
      description: "حذف كويز نهائيًا (يحتاج تأكيد).",
      parameters: {
        type: "object",
        properties: { quiz_id: { type: "string" } },
        required: ["quiz_id"],
      },
    },
  },
  // ============ مراجعة وتعليقات ============
  {
    type: "function",
    function: {
      name: "list_comments",
      description: "عرض التعليقات مع تصفية حسب الحالة.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "approved", "rejected"] },
          article_slug: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "moderate_comment",
      description: "موافقة/رفض/حذف تعليق (يحتاج تأكيد).",
      parameters: {
        type: "object",
        properties: {
          comment_id: { type: "string" },
          action: { type: "string", enum: ["approve", "reject", "delete"] },
        },
        required: ["comment_id", "action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "respond_to_question",
      description: "صياغة رد على سؤال مستخدم. publish=false يحفظ كمسودّة فقط.",
      parameters: {
        type: "object",
        properties: {
          question_id: { type: "string" },
          answer_text: { type: "string" },
          publish: { type: "boolean", description: "افتراضيًا false (يتطلب تأكيد للنشر)" },
        },
        required: ["question_id", "answer_text"],
      },
    },
  },
  // ============ استعلامات ============
  {
    type: "function",
    function: {
      name: "get_site_stats",
      description: "إحصاءات عامة للموقع.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_recent_questions",
      description: "آخر 10 أسئلة من المستخدمين.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_user_info",
      description: "معلومات تفصيلية عن مستخدم (للأدمن).",
      parameters: {
        type: "object",
        properties: { user_id: { type: "string" } },
        required: ["user_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_article_performance",
      description: "أداء مقال محدد (slug) أو إجمالي إذا لم يُحدّد.",
      parameters: {
        type: "object",
        properties: { article_slug: { type: "string" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_quiz_performance",
      description: "أداء كويز محدد (id) أو إجمالي.",
      parameters: {
        type: "object",
        properties: { quiz_id: { type: "string" } },
      },
    },
  },
  // ============ المحركات الديناميكية الجديدة ============
  {
    type: "function",
    function: {
      name: "upsert_dynamic_content",
      description: "إنشاء/تعديل محتوى ديناميكي (إعلانات، بنرات، مشاركات). draft افتراضيًا.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "اتركه فارغًا للإنشاء" },
          title: { type: "string" },
          slug: { type: "string" },
          content_type: { type: "string", description: "announcement | banner | post" },
          body: { type: "object" },
          metadata: { type: "object" },
          status: { type: "string", enum: ["draft", "published", "scheduled"] },
          scheduled_at: { type: "string" },
        },
        required: ["title", "content_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "upsert_program",
      description: "إنشاء/تعديل برنامج إيماني (رحلة/كورس). is_published=false افتراضيًا.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          slug: { type: "string" },
          description: { type: "string" },
          program_type: { type: "string", enum: ["journey", "course"] },
          cover_image: { type: "string" },
          config: { type: "object" },
          is_published: { type: "boolean" },
        },
        required: ["title", "slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "upsert_form",
      description: "إنشاء/تعديل نموذج تفاعلي (استبيان/طلب).",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          slug: { type: "string" },
          description: { type: "string" },
          form_type: { type: "string", enum: ["survey", "application", "feedback"] },
          fields: { type: "array", items: { type: "object" } },
          settings: { type: "object" },
          is_published: { type: "boolean" },
        },
        required: ["title", "slug", "fields"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "upsert_taxonomy",
      description: "إنشاء/تعديل تصنيف وعناصره (وسوم/فئات).",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          slug: { type: "string" },
          description: { type: "string" },
          items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, slug: { type: "string" } } } },
        },
        required: ["name", "slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "upsert_automation",
      description: "إنشاء/تعديل قاعدة أتمتة (مُحفِّز + إجراءات). is_active=false افتراضيًا.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          trigger_event: { type: "string" },
          conditions: { type: "object" },
          actions: { type: "array", items: { type: "object" } },
          is_active: { type: "boolean" },
        },
        required: ["name", "trigger_event", "actions"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "upsert_achievement_rule",
      description: "إنشاء/تعديل قاعدة إنجاز (شارات/مكافآت).",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          trigger_event: { type: "string" },
          conditions: { type: "object" },
          reward: { type: "object" },
          is_active: { type: "boolean" },
        },
        required: ["name", "trigger_event"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "adjust_points",
      description: "تعديل نقاط مستخدم (delta سالب/موجب) مع سبب وإشعار اختياري.",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "string" },
          delta: { type: "number", description: "موجب لإضافة، سالب للخصم" },
          reason: { type: "string" },
          notification_message: { type: "string" },
        },
        required: ["user_id", "delta", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "upsert_ad",
      description: "إنشاء/تعديل إعلان للصفحة الرئيسية.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
          image_url: { type: "string" },
          link_url: { type: "string" },
          position: { type: "string", enum: ["top", "middle", "bottom"] },
          order_index: { type: "number" },
          starts_at: { type: "string" },
          ends_at: { type: "string" },
          is_active: { type: "boolean" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "upsert_page",
      description: "إنشاء/تعديل صفحة CMS (about/contact/...).",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          slug: { type: "string" },
          content: { type: "string" },
          meta_description: { type: "string" },
          meta_keywords: { type: "string" },
          cover_image: { type: "string" },
          is_published: { type: "boolean" },
          show_in_nav: { type: "boolean" },
          order_index: { type: "number" },
        },
        required: ["title", "slug"],
      },
    },
  },
];

// Operations that require explicit admin confirmation in chat (preview only on first call)
const SENSITIVE_OPS = new Set([
  "delete_article", "delete_hadith", "delete_quiz",
  "edit_site_setting", "schedule_content", "broadcast_notification",
  "update_article", "update_hadith", "update_quiz",
  "moderate_comment", "respond_to_question",
]);

// Map tool name → entity type + arg key holding the id, for diff preview
const ENTITY_LOOKUP: Record<string, { type: string; key: string }> = {
  update_article: { type: "article", key: "article_id" },
  update_hadith: { type: "hadith", key: "hadith_id" },
  update_quiz: { type: "quiz", key: "quiz_id" },
  delete_article: { type: "article", key: "article_id" },
  delete_hadith: { type: "hadith", key: "hadith_id" },
  delete_quiz: { type: "quiz", key: "quiz_id" },
  moderate_comment: { type: "comment", key: "comment_id" },
  respond_to_question: { type: "question", key: "question_id" },
  edit_site_setting: { type: "site_setting", key: "setting_key" },
  schedule_content: { type: "", key: "content_id" }, // type comes from args.content_type
};

// deno-lint-ignore no-explicit-any
async function fetchBeforeSnapshot(name: string, args: Record<string, any>, supabase: any) {
  const lookup = ENTITY_LOOKUP[name];
  if (!lookup) return null;
  const id = args[lookup.key];
  if (!id) return null;
  const entityType = lookup.type || (args.content_type as string) || "";
  if (!entityType) return null;
  const { data, error } = await supabase.rpc("admin_preview_changes", {
    _entity_type: entityType,
    _entity_id: String(id),
  });
  if (error) return null;
  return data;
}

// deno-lint-ignore no-explicit-any
type Sb = any;

// deno-lint-ignore no-explicit-any
async function executeTool(name: string, args: Record<string, any>, supabase: Sb) {
  try {
    // ===== إنشاء =====
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
        _title: args.title, _message: args.message ?? null, _link: args.link ?? null,
      });
      if (error) return { success: false, error: error.message };
      return { success: true, recipients: data, message: `أُرسل لـ ${data} مستخدم` };
    }

    // ===== تعديل =====
    if (name === "update_article") {
      const { article_id, ...rest } = args;
      const { data, error } = await supabase.rpc("admin_update_article", {
        _article_id: article_id, _payload: rest,
      });
      if (error) return { success: false, error: error.message };
      return { success: true, id: data, message: "تم تعديل المقال" };
    }
    if (name === "update_hadith") {
      const { hadith_id, ...rest } = args;
      const { data, error } = await supabase.rpc("admin_update_hadith", {
        _hadith_id: hadith_id, _payload: rest,
      });
      if (error) return { success: false, error: error.message };
      return { success: true, id: data, message: "تم تعديل الحديث" };
    }
    if (name === "update_quiz") {
      const { quiz_id, ...rest } = args;
      const { data, error } = await supabase.rpc("admin_update_quiz", {
        _quiz_id: quiz_id, _payload: rest,
      });
      if (error) return { success: false, error: error.message };
      return { success: true, id: data, message: "تم تعديل الكويز" };
    }
    if (name === "edit_site_setting") {
      // try parse value as JSON, otherwise wrap as string
      let val: unknown = args.setting_value;
      try { val = JSON.parse(args.setting_value as string); } catch { /* keep as string */ }
      const { error } = await supabase.rpc("admin_set_site_setting", {
        _key: args.setting_key, _value: val,
      });
      if (error) return { success: false, error: error.message };
      return { success: true, message: `تم حفظ الإعداد ${args.setting_key}` };
    }
    if (name === "schedule_content") {
      const { error } = await supabase.rpc("admin_schedule_content", {
        _type: args.content_type,
        _content_id: args.content_id,
        _publish_at: args.publish_datetime,
      });
      if (error) return { success: false, error: error.message };
      return { success: true, message: `تمت جدولة ${args.content_type}` };
    }

    // ===== حذف =====
    if (name === "delete_article") {
      const { error } = await supabase.rpc("admin_delete_article", { _article_id: args.article_id });
      if (error) return { success: false, error: error.message };
      return { success: true, message: "تم حذف المقال" };
    }
    if (name === "delete_hadith") {
      const { error } = await supabase.rpc("admin_delete_hadith", { _hadith_id: args.hadith_id });
      if (error) return { success: false, error: error.message };
      return { success: true, message: "تم حذف الحديث" };
    }
    if (name === "delete_quiz") {
      const { error } = await supabase.rpc("admin_delete_quiz", { _quiz_id: args.quiz_id });
      if (error) return { success: false, error: error.message };
      return { success: true, message: "تم حذف الكويز" };
    }

    // ===== مراجعة =====
    if (name === "list_comments") {
      const status = (args.status as string) || "pending";
      let q = supabase.from("article_comments").select("id,article_slug,user_id,content,is_approved,is_hidden,created_at");
      if (status === "approved") q = q.eq("is_approved", true).eq("is_hidden", false);
      else if (status === "rejected") q = q.eq("is_hidden", true);
      else q = q.eq("is_approved", false).eq("is_hidden", false);
      if (args.article_slug) q = q.eq("article_slug", args.article_slug);
      const { data, error } = await q.order("created_at", { ascending: false }).limit((args.limit as number) || 20);
      if (error) return { success: false, error: error.message };
      return { success: true, comments: data ?? [] };
    }
    if (name === "moderate_comment") {
      const { error } = await supabase.rpc("admin_moderate_comment", {
        _comment_id: args.comment_id, _action: args.action,
      });
      if (error) return { success: false, error: error.message };
      return { success: true, message: `تم تنفيذ ${args.action} على التعليق` };
    }
    if (name === "respond_to_question") {
      const publish = args.publish === true;
      const { data, error } = await supabase.rpc("admin_respond_to_question", {
        _question_id: args.question_id,
        _answer_text: args.answer_text,
        _publish: publish,
      });
      if (error) return { success: false, error: error.message };
      return { success: true, id: data, message: publish ? "تم نشر الردّ" : "تم حفظ الردّ كمسودّة" };
    }

    // ===== استعلام =====
    if (name === "get_site_stats") {
      const [users, articles, hadiths, quizzes, questions, comments] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("articles").select("*", { count: "exact", head: true }),
        supabase.from("hadiths").select("*", { count: "exact", head: true }),
        supabase.from("quizzes").select("*", { count: "exact", head: true }),
        supabase.from("user_questions").select("*", { count: "exact", head: true }),
        supabase.from("article_comments").select("*", { count: "exact", head: true }),
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
      const { data } = await supabase.from("user_questions")
        .select("id, question, answer, is_published, created_at")
        .order("created_at", { ascending: false }).limit(10);
      return { success: true, questions: data ?? [] };
    }
    if (name === "get_user_info") {
      const { data, error } = await supabase.rpc("admin_get_user_info", { _user_id: args.user_id });
      if (error) return { success: false, error: error.message };
      return { success: true, user: data };
    }
    if (name === "get_article_performance") {
      const { data, error } = await supabase.rpc("admin_article_performance", {
        _article_slug: args.article_slug ?? null,
      });
      if (error) return { success: false, error: error.message };
      return { success: true, stats: data };
    }
    if (name === "get_quiz_performance") {
      const { data, error } = await supabase.rpc("admin_quiz_performance", {
        _quiz_id: args.quiz_id ?? null,
      });
      if (error) return { success: false, error: error.message };
      return { success: true, stats: data };
    }

    return { success: false, error: "أداة غير معروفة" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "خطأ غير معروف" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "غير مسجّل" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles as { role: string }[] | null)?.some(
      (r) => r.role === "admin" || r.role === "super_admin"
    );
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "غير مصرّح" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { messages, allow_tools, confirmed } = body as {
      messages: Array<{ role: string; content: string }>;
      allow_tools?: boolean;
      confirmed?: boolean;
    };
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages مطلوب" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const conversation: Array<Record<string, unknown>> = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    const toolCallsExecuted: Array<{ name: string; args: unknown; result: unknown }> = [];

    for (let iter = 0; iter < 6; iter++) {
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
        return new Response(
          JSON.stringify({ content: msg.content ?? "", tool_calls_executed: toolCallsExecuted }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Detect sensitive ops requiring approval
      if (!confirmed) {
        const pending = toolCalls.filter((tc) => SENSITIVE_OPS.has(tc.function.name));
        if (pending.length > 0) {
          const pendingDetailed = await Promise.all(pending.map(async (tc) => {
            let parsed: Record<string, unknown> = {};
            try { parsed = JSON.parse(tc.function.arguments); } catch { /* ignore */ }
            const before = await fetchBeforeSnapshot(tc.function.name, parsed, supabase);
            return {
              name: tc.function.name,
              args: parsed,
              before, // current state of the record (or null)
            };
          }));
          return new Response(
            JSON.stringify({
              content: msg.content ?? "هذه العملية تحتاج تأكيدًا منك. راجع المقارنة (قبل/بعد) ثم اضغط «نفّذ» أو «إلغاء».",
              tool_calls_executed: toolCallsExecuted,
              pending_confirmation: pendingDetailed,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

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
