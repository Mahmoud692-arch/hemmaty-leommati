// Article Text-to-Speech via Lovable AI Gateway (Gemini TTS)
// Uploads MP3 to storage and returns a public URL. Caches in article_audio.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonError(msg: string, status = 500) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonError("LOVABLE_API_KEY غير مهيّأ", 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return jsonError("يجب تسجيل الدخول لاستخدام الصوتيات", 401);

    const body = await req.json().catch(() => ({}));
    const article_slug = String(body?.article_slug ?? "").trim();
    const text = String(body?.text ?? "").trim();
    if (!article_slug || !text) return jsonError("article_slug و text مطلوبان", 400);

    // Cache hit?
    const { data: cached } = await admin
      .from("article_audio")
      .select("audio_url")
      .eq("article_slug", article_slug)
      .maybeSingle();
    if (cached?.audio_url) {
      return new Response(JSON.stringify({ audio_url: cached.audio_url, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanText = text.replace(/[#*_`>\[\]]/g, "").slice(0, 4500);

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
      console.error("TTS upstream:", aiResp.status, t.slice(0, 300));
      if (aiResp.status === 429) return jsonError("تجاوزت الحد المسموح، حاول لاحقًا", 429);
      if (aiResp.status === 402) return jsonError("نفدت أرصدة الذكاء الاصطناعي", 402);
      return jsonError("تعذّر توليد الصوت من المزوّد", 502);
    }

    const data = await aiResp.json();
    const audioB64 = data?.choices?.[0]?.message?.audio?.data;
    if (!audioB64) return jsonError("لا يوجد صوت في الردّ", 502);

    const bytes = b64ToBytes(audioB64);
    const path = `audio/${article_slug}-${Date.now()}.mp3`;
    const { error: upErr } = await admin.storage.from("media").upload(path, bytes, {
      contentType: "audio/mpeg",
      upsert: true,
    });
    if (upErr) {
      console.error("upload err:", upErr);
      return jsonError("تعذّر حفظ الملف الصوتي", 500);
    }
    const { data: pub } = admin.storage.from("media").getPublicUrl(path);
    const audio_url = pub.publicUrl;

    await admin.from("article_audio").upsert(
      { article_slug, audio_url, voice: "alloy" },
      { onConflict: "article_slug" },
    );

    return new Response(JSON.stringify({ audio_url, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("article-tts error:", e);
    return jsonError(e instanceof Error ? e.message : "خطأ غير معروف", 500);
  }
});
