import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type Settings = Record<string, unknown>;

const fields: { key: string; label: string; type: "text" | "color" | "switch" }[] = [
  { key: "site_name", label: "اسم الموقع", type: "text" },
  { key: "site_description", label: "وصف الموقع", type: "text" },
  { key: "site_logo", label: "رابط الشعار", type: "text" },
  { key: "primary_color", label: "اللون الأساسي", type: "color" },
  { key: "accent_color", label: "اللون الفرعي", type: "color" },
  { key: "font_heading", label: "خط العناوين", type: "text" },
  { key: "font_body", label: "خط النص", type: "text" },
  { key: "comments_enabled", label: "تفعيل التعليقات", type: "switch" },
  { key: "comments_require_approval", label: "موافقة الأدمن قبل النشر", type: "switch" },
];

export default function SettingsManager() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("key,value");
      const m: Settings = {};
      (data ?? []).forEach((r) => {
        m[r.key] = r.value;
      });
      setSettings(m);
      setLoading(false);
    })();
  }, []);

  const set = (k: string, v: unknown) => setSettings((p) => ({ ...p, [k]: v }));

  const save = async () => {
    const rows = Object.entries(settings).map(([key, value]) => ({ key, value: value as never }));
    const { error } = await supabase.from("site_settings").upsert(rows);
    if (error) return toast.error(error.message);
    toast.success("تم حفظ الإعدادات");
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">جارٍ التحميل…</div>;

  return (
    <div>
      <h2 className="font-display text-2xl mb-4">إعدادات الموقع</h2>
      <div className="space-y-4 max-w-xl">
        {fields.map((f) => {
          const v = settings[f.key];
          if (f.type === "switch") {
            return (
              <div key={f.key} className="flex items-center justify-between rounded-lg border p-3">
                <Label>{f.label}</Label>
                <Switch checked={Boolean(v)} onCheckedChange={(b) => set(f.key, b)} />
              </div>
            );
          }
          return (
            <div key={f.key}>
              <Label>{f.label}</Label>
              <Input
                type={f.type === "color" ? "color" : "text"}
                value={typeof v === "string" ? v : ""}
                onChange={(e) => set(f.key, e.target.value)}
              />
            </div>
          );
        })}
        <Button onClick={save}>حفظ التغييرات</Button>
      </div>
    </div>
  );
}
