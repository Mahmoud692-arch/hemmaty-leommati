import { useEffect, useRef, useState } from "react";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { addNotificationListener } from "@/integrations/supabase/notifications";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "@tanstack/react-router";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const channelRef = useRef<any>(null);

  const load = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    setItems((data ?? []) as Notification[]);
  };

  useEffect(() => {
    if (!user?.id) return;

    load();

    // Prevent creating the channel twice for the same component instance
    if (channelRef.current) return;

    // Use a shared notifications manager so only one realtime channel
    // per user is created and callbacks are registered before subscribe.
    let mounted = true;

    const unsub = addNotificationListener(user.id, () => {
      if (!mounted) return;
      load();
    });

    channelRef.current = { unsub };

    return () => {
      mounted = false;
      if (channelRef.current) {
        try {
          channelRef.current.unsub();
        } catch (e) {
          /* ignore */
        }
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  if (!user) return null;

  const unread = items.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    load();
  };

  const markOne = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    load();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <span className="text-sm font-semibold">الإشعارات</span>

          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              <Check className="w-3 h-3 ms-1" />
              قراءة الكل
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              لا إشعارات بعد
            </div>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  markOne(n.id);
                  setOpen(false);
                }}
                className={`p-3 border-b text-sm cursor-pointer hover:bg-accent ${
                  !n.is_read ? "bg-accent/20" : ""
                }`}
              >
                <div className="font-medium">{n.title}</div>
                {n.message && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {n.message}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}