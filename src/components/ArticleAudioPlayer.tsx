import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Pause, Play, Loader2 } from "lucide-react";
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleClick = async () => {
    if (!user) {
      toast.error("سجّل دخولك لاستخدام الاستماع الصوتي");
      return;
    }
    if (audioUrl && audioRef.current) {
      if (playing) {
        audioRef.current.pause();
        setPlaying(false);
      } else {
        audioRef.current.play();
        setPlaying(true);
      }
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("article-tts", {
        body: { article_slug: articleSlug, text },
      });
      if (error) throw error;
      if (data?.audio_url) {
        setAudioUrl(data.audio_url);
        setTimeout(() => {
          audioRef.current?.play();
          setPlaying(true);
        }, 100);
      } else {
        toast.error(data?.error ?? "تعذّر توليد الصوت");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطأ غير معروف";
      toast.error(msg);
    }
    setLoading(false);
  };

  return (
    <div className="card-elegant rounded-xl p-4 my-6 flex items-center gap-3">
      <Button onClick={handleClick} disabled={loading} size="sm" variant="outline">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
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
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          className="hidden"
        />
      )}
    </div>
  );
}
