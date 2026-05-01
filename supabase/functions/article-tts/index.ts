// Article Text-to-Speech via Lovable AI Gateway (Gemini TTS)
// Returns base64 mp3 audio for given article text. Caches result in article_audio table.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
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

    // CRITICAL: require authenticated user to prevent anonymous AI credit abuse
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "يجب تسجيل الدخول لاستخدام الصوتيات" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { article_slug, text } = await req.json();
    if (!article_slug || !text) {
      return new Response(JSON.stringify({ error: "article_slug و text مطلوبان" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check cache first
    const { data: cached } = await supabase
      .from("article_audio")
      .select("audio_url")
      .eq("article_slug", article_slug)
      .maybeSingle();
    if (cached?.audio_url) {
      return new Response(JSON.stringify({ audio_url: cached.audio_url, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Trim text (TTS limits)
    const cleanText = String(text).replace(/[#*_`>\[\]]/g, "").slice(0, 4500);

    // Use Gemini-2.5-flash to synthesize speech via audio modality
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        modalities: ["audio"],
        audio: { voice: "alloy", format: "mp3" },
        messages: [
          { role: "system", content: "اقرأ النص العربي التالي بصوت فصيح هادئ وواضح، بدون تعليق." },
          { role: "user", content: cleanText },
        ],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("TTS error:", aiResp.status, t);
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "تجاوزت الحد المسموح" }), { status: 429, headers: corsHeaders });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "نفدت الأرصدة" }), { status: 402, headers: corsHeaders });
      return new Response(JSON.stringify({ error: "تعذّر توليد الصوت" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const audioB64 = data?.choices?.[0]?.message?.audio?.data;
    if (!audioB64) {
      return new Response(JSON.stringify({ error: "لا يوجد صوت في الردّ" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dataUrl = `data:audio/mpeg;base64,${audioB64}`;

    // Cache
    await supabase.from("article_audio").upsert({
      article_slug, audio_url: dataUrl, voice: "alloy",
    }, { onConflict: "article_slug" });

    return new Response(JSON.stringify({ audio_url: dataUrl, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("article-tts error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير معروف" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
