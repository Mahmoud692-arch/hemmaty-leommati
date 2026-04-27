import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, Loader2, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface TestResult {
  name: string;
  pass: boolean;
  detail: string;
}

interface RunResponse {
  tested_at: string;
  tester_email: string;
  results: TestResult[];
  total: number;
  passed: number;
}

export default function RLSTestPanel() {
  const [running, setRunning] = useState(false);
  const [data, setData] = useState<RunResponse | null>(null);

  const run = async () => {
    setRunning(true);
    try {
      const { data: rpcData, error } = await supabase.rpc("admin_run_rls_smoke_tests");
      if (error) {
        toast.error(error.message);
        return;
      }
      const res = rpcData as unknown as RunResponse;
      setData(res);
      if (res.passed === res.total) {
        toast.success(`✅ نجحت كل الاختبارات (${res.passed}/${res.total})`);
      } else {
        toast.warning(`⚠️ ${res.total - res.passed} اختبار(ات) فشلت من ${res.total}`);
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border p-5 bg-gradient-to-br from-emerald-500/5 to-blue-500/5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <div className="font-bold text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" /> اختبارات سياسات الأمان (RLS)
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              فحص فوري لسياسات الوصول الحساسة: ملفات المستخدمين، الشارات، أسئلة الكويزات، التخزين، وسجل التدقيق.
            </p>
          </div>
          <Button onClick={run} disabled={running}>
            {running ? (
              <><Loader2 className="h-4 w-4 ml-1 animate-spin" /> جارٍ الفحص…</>
            ) : data ? (
              <><RefreshCw className="h-4 w-4 ml-1" /> إعادة الفحص</>
            ) : (
              <><Play className="h-4 w-4 ml-1" /> تشغيل الاختبارات</>
            )}
          </Button>
        </div>

        {data && (
          <div className="text-xs text-muted-foreground mb-3">
            آخر فحص: {new Date(data.tested_at).toLocaleString("ar-EG")} ·
            النتيجة: <span className={`font-bold ${data.passed === data.total ? "text-emerald-600" : "text-amber-600"}`}>
              {data.passed} / {data.total}
            </span>
          </div>
        )}
      </div>

      {data && (
        <div className="grid gap-2">
          {data.results.map((r, i) => (
            <div
              key={i}
              className={`rounded-xl border p-3 flex items-start gap-3 ${
                r.pass
                  ? "bg-emerald-500/5 border-emerald-500/30"
                  : "bg-destructive/5 border-destructive/30"
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {r.pass ? (
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                ) : (
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`font-semibold text-sm ${r.pass ? "text-emerald-900 dark:text-emerald-200" : "text-destructive"}`}>
                  {r.name}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{r.detail}</div>
              </div>
              <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                r.pass ? "bg-emerald-500/15 text-emerald-700" : "bg-destructive/15 text-destructive"
              }`}>
                {r.pass ? "ناجح" : "فاشل"}
              </div>
            </div>
          ))}
        </div>
      )}

      {!data && !running && (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          اضغط «تشغيل الاختبارات» لفحص سلامة سياسات الأمان فورًا.
        </div>
      )}
    </div>
  );
}
