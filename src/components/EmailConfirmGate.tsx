import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { MailCheck, MailWarning } from "lucide-react";
import { toast } from "sonner";

interface Props {
  feature?: string;
  className?: string;
}

/**
 * يُعرض كحاجز أعلى أي إجراء يحتاج تأكيد البريد.
 * إن لم يكن المستخدم مسجَّلًا أو غير مؤكد بريدَه يظهر التنبيه ولا يُسمح بالإجراء.
 */
export default function EmailConfirmGate({ feature = "هذا الإجراء", className = "" }: Props) {
  const { user, isEmailConfirmed, resendConfirmation } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!user || isEmailConfirmed) return null;

  const resend = async () => {
    setSending(true);
    const { error } = await resendConfirmation();
    setSending(false);
    if (error) return toast.error("تعذّر إرسال رسالة التأكيد");
    setSent(true);
    toast.success("أرسلنا رابط تأكيد جديدًا إلى بريدك");
  };

  return (
    <div
      className={`rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 flex flex-col sm:flex-row gap-3 items-start ${className}`}
    >
      <MailWarning className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-amber-900 dark:text-amber-200">
          فعّل بريدك أوّلًا لتتمكّن من {feature}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          أرسلنا رابطَ تأكيد إلى <span className="font-mono">{user.email}</span>. افتحه ثم أعد تحميل الصفحة.
        </p>
        <div className="mt-3 flex gap-2 items-center flex-wrap">
          <Button size="sm" variant="outline" onClick={resend} disabled={sending || sent}>
            <MailCheck className="h-3 w-3 ml-1" />
            {sent ? "تم الإرسال" : sending ? "جارٍ الإرسال…" : "إعادة إرسال"}
          </Button>
        </div>
      </div>
    </div>
  );
}
