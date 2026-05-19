import { supabase } from "./client";

type Handler = (payload: any) => void;

const managers = new Map<string, { channel: any; handlers: Set<Handler> }>();

function createManager(userId: string) {
  const topic = `notif-${userId}`;
  // If a channel with this topic already exists and is subscribed,
  // remove it first so we can register handlers before subscribing.
  try {
    // @ts-ignore
    const channels = typeof supabase.getChannels === "function" ? supabase.getChannels() : [];
    const existing = channels.find((c: any) => c.topic === `realtime:${topic}` || c.topic === topic);
    if (existing) {
      try {
        supabase.removeChannel(existing);
      } catch (e) {
        // ignore removal errors
      }
    }
  } catch (e) {
    // ignore
  }

  let handlers = new Set<Handler>();

  // helper to build a channel and register handlers; returns channel or throws
  const buildChannel = (t: string) => {
    const ch = supabase.channel(t);
    ch.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload: any) => {
        handlers.forEach((h) => {
          try {
            h(payload);
          } catch (e) {
            // handlers should be resilient
          }
        });
      }
    );

    // subscribe and ignore errors; if subscribe returns a Promise attach a
    // catch handler, otherwise ignore synchronous result.
    try {
      const subRes = ch.subscribe();
      if (subRes && typeof (subRes as any).then === "function") {
        (subRes as Promise<any>).catch(() => {});
      }
    } catch (e) {
      // ignore
    }
    return ch;
  };

  let channel: any;

  try {
    channel = buildChannel(topic);
  } catch (err: any) {
    // If registering handlers after subscribe is disallowed because a
    // channel with that topic already exists and is subscribed, try to
    // remove any conflicting channels and recreate. If that fails, fall
    // back to creating a unique topic per session.
    try {
      // @ts-ignore
      const channels = typeof supabase.getChannels === "function" ? supabase.getChannels() : [];
      for (const c of channels) {
        if (String(c.topic).includes(topic)) {
          try {
            supabase.removeChannel(c);
          } catch (e) {
            // ignore
          }
        }
      }
    } catch (e) {
      // ignore
    }

    try {
      channel = buildChannel(topic);
    } catch (e) {
      // last resort: use unique topic
      const uniqueTopic = `${topic}-${Math.random().toString(36).slice(2, 8)}`;
      channel = buildChannel(uniqueTopic);
    }
  }

  const m = { channel, handlers };
  managers.set(userId, m);
  return m;
}

export function addNotificationListener(userId: string, handler: Handler) {
  if (!managers.has(userId)) createManager(userId);
  const m = managers.get(userId)!;
  m.handlers.add(handler);

  return () => {
    m.handlers.delete(handler);
    if (m.handlers.size === 0) {
      try {
        supabase.removeChannel(m.channel);
      } catch (e) {
        // ignore
      }
      managers.delete(userId);
    }
  };
}

export function hasManager(userId: string) {
  return managers.has(userId);
}
