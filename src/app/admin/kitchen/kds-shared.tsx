"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { pick } from "@/lib/language-context";
import { formatOrderNumber } from "@/lib/order-status";
import { isTakeawayTable, isDeliveryTable } from "@/lib/order-mode";
import type { KdsLine } from "./kds-types";

const SOUND_MUTED_KEY = "sindibad-kitchen-sound-muted";
const MUTED_CHANGE_EVENT = "sindibad-kitchen-muted-change";

export function readMuted() {
  try {
    return localStorage.getItem(SOUND_MUTED_KEY) === "1";
  } catch {
    // localStorage unavailable — keep sound on by default.
    return false;
  }
}

function subscribeToMuted(callback: () => void) {
  window.addEventListener(MUTED_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(MUTED_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useMuted() {
  return useSyncExternalStore(subscribeToMuted, readMuted, () => false);
}

function setMuted(muted: boolean) {
  try {
    localStorage.setItem(SOUND_MUTED_KEY, muted ? "1" : "0");
  } catch {
    // ignore persistence failures
  }
  window.dispatchEvent(new Event(MUTED_CHANGE_EVENT));
}

// Start from the server's render time so the hydrated timers match the HTML.
export function useNow(renderedAt: number, intervalMs = 1000) {
  const [now, setNow] = useState(renderedAt);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);
  return now;
}

// Re-fetches the server-rendered board on every order event, and on
// reconnect to catch up on anything missed while the connection was down.
export function useKitchenStream() {
  const router = useRouter();
  useEffect(() => {
    const source = new EventSource("/api/orders/stream");
    source.onmessage = () => router.refresh();
    source.onopen = () => router.refresh();
    return () => source.close();
  }, [router]);
}

export { isHeld, lineStart } from "./kds-types";

export function formatCountdown(toIso: string, now: number) {
  const seconds = Math.max(0, Math.ceil((new Date(toIso).getTime() - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function minutesBetween(fromIso: string, to: number) {
  return Math.max(0, (to - new Date(fromIso).getTime()) / 60000);
}

export function formatElapsed(fromIso: string, now: number) {
  const seconds = Math.floor(minutesBetween(fromIso, now) * 60);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export type Urgency = "ok" | "warn" | "late";

// Amber from 75% of the poste's target, red once it's over.
export function urgencyFor(minutes: number, targetMinutes: number): Urgency {
  if (minutes >= targetMinutes) return "late";
  if (minutes >= targetMinutes * 0.75) return "warn";
  return "ok";
}

export const URGENCY_BADGE: Record<Urgency, string> = {
  ok: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  warn: "bg-amber-500/20 text-amber-300 ring-amber-500/40",
  late: "bg-red-500/25 text-red-200 ring-red-500/50",
};

export const URGENCY_BORDER: Record<Urgency, string> = {
  ok: "border-neutral-700",
  warn: "border-amber-500/70",
  late: "border-red-500",
};

export function ticketNumber(number: number | null) {
  return number != null ? `#${formatOrderNumber(number)}` : "—";
}

export function modeLabel(tableNumber: string, lang: "ar" | "fr") {
  if (isTakeawayTable(tableNumber)) return pick(lang, "طلب خارجي", "À emporter");
  if (isDeliveryTable(tableNumber)) return pick(lang, "توصيل", "Livraison");
  return `${pick(lang, "طاولة", "Table")} ${tableNumber}`;
}

export function LineList({
  lines,
  lang,
  size = "lg",
}: {
  lines: KdsLine[];
  lang: "ar" | "fr";
  size?: "lg" | "md";
}) {
  return (
    <ul className="flex flex-col gap-2">
      {lines.map((line) => (
        <li
          key={line.id}
          className={`leading-snug ${size === "lg" ? "text-xl" : "text-base"} ${
            line.doneAt ? "text-neutral-500 line-through" : "text-neutral-50"
          }`}
        >
          <span className="font-bold tabular-nums text-amber-300">{line.quantity}×</span>{" "}
          <span className="font-semibold">{pick(lang, line.nameAr, line.nameFr)}</span>
          {line.size === "LARGE" && (
            <span className="ml-1.5 rounded bg-neutral-700 px-1.5 py-0.5 text-xs font-bold text-neutral-100">
              L
            </span>
          )}
          {line.optionsFr && (
            <span
              className={`block ps-7 ${size === "lg" ? "text-base" : "text-sm"} text-neutral-400`}
            >
              {pick(lang, line.optionsAr ?? "", line.optionsFr)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function KdsToolbar({ lang, now }: { lang: "ar" | "fr"; now: number }) {
  const muted = useMuted();
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden rounded-md bg-neutral-800 px-3 py-2 text-lg font-semibold tabular-nums text-neutral-100 sm:inline">
        {new Date(now).toLocaleTimeString("fr-MA", { hour: "2-digit", minute: "2-digit" })}
      </span>
      <button
        type="button"
        onClick={() => setMuted(!muted)}
        className="min-h-[44px] rounded-md border border-neutral-700 px-3 text-sm text-neutral-300 hover:border-neutral-500"
      >
        {muted ? pick(lang, "🔕 الصوت متوقف", "🔕 Son coupé") : pick(lang, "🔔 الصوت", "🔔 Son")}
      </button>
      <button
        type="button"
        onClick={toggleFullscreen}
        className="min-h-[44px] rounded-md border border-neutral-700 px-3 text-sm text-neutral-300 hover:border-neutral-500"
      >
        {fullscreen ? pick(lang, "⤡ خروج", "⤡ Quitter") : pick(lang, "⤢ ملء الشاشة", "⤢ Plein écran")}
      </button>
    </div>
  );
}
