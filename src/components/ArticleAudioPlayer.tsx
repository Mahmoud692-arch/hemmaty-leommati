import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Pause, Play, Loader2, RotateCcw, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  articleSlug: string;
  text: string;
}

export default function ArticleAudioPlayer({ articleSlug, text }: Props) {
  const { user } = useAuth();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generate = async () => {
    if (!user) {
      toast.error("سجّل دخولك لاستخدام الاستماع الصوتي");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("article-tts", {
        body: { article_slug: articleSlug, text },
      });
      if (fnErr) throw new Error(fnErr.message || "تعذّر الاتصال بخدمة الصوت");
      if (!data?.audio_url) {
        throw new Error(data?.error ?? "لم يُرجع المزوّد رابطًا للصوت");
      }
      setAudioUrl(data.audio_url);
      setTimeout(() => {
        audioRef.current?.play().catch(() => undefined);
      }, 100);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطأ غير معروف";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play().catch(() => undefined);
  };

  const onClick = () => (audioUrl ? toggle() : generate());

  return (
    <div className="card-elegant rounded-xl p-4 my-6 flex items-center gap-3 flex-wrap">
      <Button onClick={onClick} disabled={loading} size="sm" variant="outline">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin ml-1" />
        ) : playing ? (
          <Pause className="h-4 w-4 ml-1" />
        ) : audioUrl ? (
          <Play className="h-4 w-4 ml-1" />
        ) : (
          <Volume2 className="h-4 w-4 ml-1" />
        )}
        {loading ? "جارٍ التحضير…" : playing ? "إيقاف" : audioUrl ? "تشغيل" : "استمع للمقال"}
      </Button>
      <span className="text-xs text-muted-foreground">قراءة صوتية بالعربية الفصحى</span>
      {error && (
        <>
          <span className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {error}
          </span>
          <Button onClick={generate} disabled={loading} size="sm" variant="ghost">
            <RotateCcw className="h-3 w-3 ml-1" /> إعادة المحاولة
          </Button>
        </>
      )}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          controls
          preload="none"
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          onError={() => {
            setError("تعذّر تشغيل الملف الصوتي");
            setAudioUrl(null);
          }}
          className="w-full mt-2"
        />
      )}
    </div>
  );
}
