"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { formatOrderNumber } from "@/lib/order-status";
import {
  isAudioUnlocked,
  playChime,
  subscribeToAudioState,
  unlockAudio,
  PICKUP_ALERT,
} from "@/lib/sound";

export type DisplayOrder = {
  number: number;
  name: string | null;
  ready: boolean;
  readyAt: string | null;
};

// How long a just-ready number keeps glowing in the "ready" list.
const FRESH_SECONDS = 90;
// How long each full-screen "your order is ready" announcement stays up.
const ANNOUNCE_MS = 7000;
// Safety net in case an event is missed: also expires stale ready orders.
const REFRESH_MS = 60000;
const MAX_READY = 12;
const MAX_PREPARING = 24;

function Clock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" })
      );
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, []);
  return <span className="tabular-nums">{time}</span>;
}

function keepScreenAwake() {
  try {
    const wakeLock = (
      navigator as Navigator & {
        wakeLock?: { request: (type: "screen") => Promise<unknown> };
      }
    ).wakeLock;
    void wakeLock?.request("screen").catch(() => {});
  } catch {
    // Not supported — the TV's own sleep settings apply.
  }
}

export function PickupDisplay({ orders }: { orders: DisplayOrder[] }) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  // Kiosk browsers launched with autoplay allowed skip the "tap to enable" prompt.
  const soundReady = useSyncExternalStore(
    subscribeToAudioState,
    isAudioUnlocked,
    () => true
  );
  const [queue, setQueue] = useState<DisplayOrder[]>([]);
  // Numbers already on screen as ready, so a page load or refresh never
  // re-announces orders that were ready before.
  const seenReady = useRef<Set<number> | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    keepScreenAwake();
    // The wake lock is dropped whenever the tab is hidden; take it back.
    const onVisible = () => {
      if (document.visibilityState === "visible") keepScreenAwake();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/orders/stream?display=1");
    source.onmessage = () => router.refresh();
    source.onopen = () => router.refresh();
    const interval = setInterval(() => router.refresh(), REFRESH_MS);
    return () => {
      source.close();
      clearInterval(interval);
    };
  }, [router]);

  useEffect(() => {
    const readyNow = orders.filter((order) => order.ready);
    if (seenReady.current === null) {
      seenReady.current = new Set(readyNow.map((order) => order.number));
      return;
    }
    const fresh = readyNow.filter((order) => !seenReady.current!.has(order.number));
    // Forget numbers that left the ready list so tomorrow's #001 is announced.
    seenReady.current = new Set(readyNow.map((order) => order.number));
    if (fresh.length > 0) setQueue((prev) => [...prev, ...fresh]);
  }, [orders]);

  const announcing = queue[0] ?? null;

  useEffect(() => {
    if (!announcing) return;
    playChime(PICKUP_ALERT, { gap: 0.45, volume: 0.5, length: 1.1 });
    const timeout = setTimeout(() => setQueue((prev) => prev.slice(1)), ANNOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [announcing]);

  const enableSound = useCallback(async () => {
    const ok = await unlockAudio();
    if (ok) playChime([1046.5], { volume: 0.2 });
    keepScreenAwake();
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      // Fullscreen refused — the screen still works in a normal window.
    }
  }, []);

  const preparing = orders.filter((order) => !order.ready).slice(0, MAX_PREPARING);
  const ready = orders
    .filter((order) => order.ready)
    .sort((a, b) => (b.readyAt ?? "").localeCompare(a.readyAt ?? ""))
    .slice(0, MAX_READY);

  const isFresh = (order: DisplayOrder) =>
    order.readyAt != null &&
    now - new Date(order.readyAt).getTime() < FRESH_SECONDS * 1000;

  return (
    <div
      dir="ltr"
      className="fixed inset-0 flex cursor-none select-none flex-col overflow-hidden bg-[var(--sindibad-cream)] text-[var(--sindibad-ink)]"
    >
      <header className="flex h-[11vh] shrink-0 items-center justify-between border-b border-[var(--sindibad-line)] px-[3vw]">
        <div className="flex items-center gap-[1.2vw]">
          <Image
            src="/brand/icon-mark.png"
            alt=""
            width={96}
            height={36}
            className="h-[4.5vh] w-auto"
            priority
          />
          <span className="font-display text-[2.6vw] tracking-wide text-[var(--sindibad-maroon)]">
            Sindibad
          </span>
        </div>
        <span className="font-display text-[2.4vw] text-[var(--sindibad-muted)]">
          <Clock />
        </span>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[38fr_62fr]">
        <section className="flex min-h-0 flex-col border-r border-[var(--sindibad-line)] px-[2.5vw] py-[3vh]">
          <h2 className="mb-[3vh] flex items-baseline justify-between gap-4">
            <span className="font-display text-[2.4vw] tracking-wide">En préparation</span>
            <span dir="rtl" className="text-[2.2vw] font-bold">
              قيد التحضير
            </span>
          </h2>
          <div className="grid grid-cols-3 content-start gap-[1.2vw]">
            {preparing.map((order) => (
              <div
                key={order.number}
                className="rounded-[0.6vw] border border-[var(--sindibad-line)] bg-[var(--sindibad-paper)] py-[1.4vh] text-center font-display text-[3.6vw] leading-none tabular-nums text-[var(--sindibad-muted)]"
              >
                {formatOrderNumber(order.number)}
              </div>
            ))}
          </div>
          {preparing.length === 0 && (
            <p className="mt-[4vh] text-center text-[1.4vw] text-[var(--sindibad-muted)] opacity-60">
              —
            </p>
          )}
        </section>

        <section className="flex min-h-0 flex-col bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.12),transparent_70%)] px-[2.5vw] py-[3vh]">
          <h2 className="mb-[3vh] flex items-baseline justify-between gap-4 text-[var(--sindibad-maroon)]">
            <span className="font-display text-[2.8vw] tracking-wide">Prête · Bon appétit</span>
            <span dir="rtl" className="text-[2.6vw] font-bold">
              جاهز · بالهناء
            </span>
          </h2>
          <div className="grid grid-cols-3 content-start gap-[1.4vw]">
            {ready.map((order) => {
              const fresh = isFresh(order);
              return (
                <div
                  key={order.number}
                  className={`rounded-[0.8vw] border-2 px-[1vw] py-[2vh] text-center ${
                    fresh
                      ? "pickup-glow border-[var(--sindibad-maroon)] bg-[var(--sindibad-maroon)] text-[var(--sindibad-cream)]"
                      : "border-[var(--sindibad-maroon)] bg-[var(--sindibad-paper)] text-[var(--sindibad-maroon)]"
                  }`}
                >
                  <p className="font-display text-[6vw] font-bold leading-none tabular-nums">
                    {formatOrderNumber(order.number)}
                  </p>
                  {order.name && (
                    <p className="mt-[1vh] truncate text-[1.6vw] opacity-80">{order.name}</p>
                  )}
                </div>
              );
            })}
          </div>
          {ready.length === 0 && (
            <p className="mt-[8vh] text-center text-[1.6vw] text-[var(--sindibad-muted)]">
              Votre numéro s&apos;affichera ici dès que votre commande sera prête
              <span dir="rtl" className="mt-[1vh] block">
                سيظهر رقمك هنا عندما يصبح طلبك جاهزاً
              </span>
            </p>
          )}
        </section>
      </div>

      {announcing && (
        <div
          key={announcing.number}
          className="pickup-pop absolute inset-0 z-20 flex flex-col items-center justify-center bg-[rgba(22,17,11,0.97)] text-center"
        >
          <p className="font-display text-[3.2vw] tracking-wide text-[var(--sindibad-ink)]">
            Commande prête
            <span dir="rtl" className="mx-[1.5vw] font-bold">
              · الطلب جاهز ·
            </span>
          </p>
          <p className="pickup-glow-text mt-[2vh] font-display text-[26vw] font-bold leading-none tabular-nums text-[var(--sindibad-maroon)]">
            {formatOrderNumber(announcing.number)}
          </p>
          {announcing.name && (
            <p className="mt-[2vh] text-[4vw] text-[var(--sindibad-rose)]">{announcing.name}</p>
          )}
          <p className="mt-[3vh] text-[2vw] text-[var(--sindibad-muted)]">
            Merci de vous présenter au comptoir
            <span dir="rtl" className="mx-[1vw]">
              · المرجو التوجه إلى الشباك
            </span>
          </p>
        </div>
      )}

      {!soundReady && (
        <button
          type="button"
          onClick={enableSound}
          className="absolute inset-0 z-30 flex cursor-pointer flex-col items-center justify-center gap-[2vh] bg-black/80 text-center"
        >
          <span className="text-[6vw]">🔊</span>
          <span className="font-display text-[2.4vw] text-[var(--sindibad-ink)]">
            Touchez l&apos;écran pour activer le son
          </span>
          <span dir="rtl" className="text-[2vw] text-[var(--sindibad-muted)]">
            المس الشاشة لتفعيل الصوت
          </span>
        </button>
      )}
    </div>
  );
}
