"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SendHorizonal } from "lucide-react";
import type { ChatMessage } from "@/lib/api";
import { Avatar } from "@/components/person-card";

const POLL_MS = 5000;

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

/**
 * Party Room chat, delivered by polling.
 *
 * Every five seconds, and only while the tab is actually visible — a phone in
 * someone's pocket shouldn't be asking the server for messages nobody is
 * reading. Each poll sends the newest timestamp it holds, so a quiet room
 * costs an empty array rather than the whole history.
 *
 * Not WebSockets (Vercel Functions can't hold a connection open) and not
 * LiveKit (billed per connection-minute, a media price for moving a sentence).
 * When rooms get busy enough that five seconds feels slow, Supabase Realtime
 * subscribes to these same rows and this component keeps its shape.
 */
export function PartyChat({ planId, initial }: { planId: string; initial: ChatMessage[] }) {
  const [messages, setMessages] = useState(initial);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const latest = messages[messages.length - 1]?.createdAt;

  const poll = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const query = latest ? `?since=${encodeURIComponent(latest)}` : "";
      const res = await fetch(`/api/plans/${planId}/messages${query}`);
      if (!res.ok) return;
      const fresh: ChatMessage[] = await res.json();
      if (fresh.length === 0) return;
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...prev, ...fresh.filter((m) => !seen.has(m.id))];
      });
    } catch {
      // A dropped poll is not worth telling anyone about; the next one is 5s away.
    }
  }, [planId, latest]);

  useEffect(() => {
    const timer = setInterval(() => void poll(), POLL_MS);
    // Coming back to the tab should feel instant, not up to five seconds stale.
    const onVisible = () => void poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setError(null);
    const res = await fetch(`/api/plans/${planId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setSending(false);

    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "that didn't send");
      return;
    }
    setDraft("");
    const message: ChatMessage = await res.json();
    setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
  }

  return (
    <div className="flex h-[min(60vh,560px)] flex-col border-2 border-foreground bg-paper shadow-stamp">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <p className="text-2xl uppercase">Nobody&apos;s said anything yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Break the ice — it&apos;s easier here than at the door.
              </p>
            </div>
          </div>
        ) : (
          messages.map((message, i) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.isYou ? "flex-row-reverse" : ""}`}
            >
              <Avatar
                name={message.sender.name}
                image={message.sender.image}
                index={i}
                size="sm"
              />
              <div className={`max-w-[75%] ${message.isYou ? "text-right" : ""}`}>
                <p className="meta-label text-muted-foreground">
                  {message.isYou ? "You" : message.sender.name} · {time(message.createdAt)}
                </p>
                <p
                  className={`mt-1 inline-block whitespace-pre-wrap break-words border-2 border-foreground px-3 py-2 text-left ${
                    message.isYou ? "bg-secondary text-secondary-foreground" : "bg-card"
                  }`}
                >
                  {message.body}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottom} />
      </div>

      <div className="border-t-2 border-foreground p-3">
        {error && <p className="mb-2 text-sm font-bold text-primary">{error}</p>}
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Say something to the crew"
            maxLength={2000}
            className="min-w-0 flex-1 rounded-sm border-2 border-foreground bg-background p-3 outline-none focus:shadow-stamp-sm"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || !draft.trim()}
            aria-label="Send"
            className="flex size-12 shrink-0 items-center justify-center border-2 border-foreground bg-primary text-primary-foreground shadow-stamp-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
          >
            <SendHorizonal className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
