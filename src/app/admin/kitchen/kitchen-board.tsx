"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLanguage, pick } from "@/lib/language-context";
import { advanceOrderStatus } from "@/app/actions/orders";
import {
  KITCHEN_STATUSES,
  ORDER_STATUS_LABEL,
  formatOrderNumber,
  type OrderStatus,
} from "@/lib/order-status";
import { isTakeawayTable, isDeliveryTable } from "@/lib/order-mode";
import type { OrderEvent } from "@/lib/order-events";
import { playChime, STAFF_ALERT } from "@/lib/sound";

type KitchenLine = {
  id: string;
  nameAr: string;
  nameFr: string;
  size: string | null;
  optionsAr: string | null;
  optionsFr: string | null;
  quantity: number;
  confirmed: boolean;
};

type KitchenOrder = {
  id: string;
  number: number | null;
  tableNumber: string;
  guestName: string | null;
  note: string | null;
  status: OrderStatus;
  createdAt: string;
  readyAt: string | null;
  items: KitchenLine[];
};

const SOUND_MUTED_KEY = "sindibad-kitchen-sound-muted";
const MUTED_CHANGE_EVENT = "sindibad-kitchen-muted-change";

function readMuted() {
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
const WAIT_WARN_MINUTES = 10;
const WAIT_URGENT_MINUTES = 20;

const COLUMN_TITLE: Record<string, { ar: string; fr: string }> = {
  CONFIRMED: { ar: "للتحضير", fr: "À préparer" },
  PREPARING: { ar: "قيد التحضير", fr: "En préparation" },
  READY: { ar: "جاهز للتسليم", fr: "Prête — à remettre" },
};

const ACTION: Record<
  string,
  { ar: string; fr: string; className: string }
> = {
  CONFIRMED: {
    ar: "👨‍🍳 بدء التحضير",
    fr: "👨‍🍳 Commencer",
    className: "bg-neutral-900 text-white hover:bg-neutral-700",
  },
  PREPARING: {
    ar: "🔔 الطلب جاهز",
    fr: "🔔 Commande prête",
    className: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
  READY: {
    ar: "✓ تم التسليم",
    fr: "✓ Remise au client",
    className:
      "border border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500",
  },
};

function minutesSince(iso: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

function modeLabel(tableNumber: string, lang: "ar" | "fr") {
  if (isTakeawayTable(tableNumber)) return pick(lang, "طلب خارجي", "À emporter");
  if (isDeliveryTable(tableNumber)) return pick(lang, "توصيل", "Livraison");
  return `${pick(lang, "طاولة", "Table")} ${tableNumber}`;
}

function KitchenCard({ order, now }: { order: KitchenOrder; now: number }) {
  const { lang } = useLanguage();
  const [pending, startTransition] = useTransition();
  const action = ACTION[order.status];
  const waited = minutesSince(order.createdAt, now);
  const isReady = order.status === "READY";
  const urgent = !isReady && waited >= WAIT_URGENT_MINUTES;
  const warn = !isReady && waited >= WAIT_WARN_MINUTES;

  return (
    <div
      className={`rounded-lg border bg-white p-4 shadow-sm ${
        isReady ? "border-emerald-300" : urgent ? "border-red-300" : "border-neutral-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-3xl font-bold tabular-nums tracking-tight text-neutral-900">
            {order.number != null ? `#${formatOrderNumber(order.number)}` : "—"}
          </p>
          <p className="mt-0.5 truncate text-sm text-neutral-500">
            {modeLabel(order.tableNumber, lang)}
            {order.guestName ? ` · ${order.guestName}` : ""}
          </p>
        </div>
        <span
          className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
            isReady
              ? "bg-emerald-100 text-emerald-800"
              : urgent
                ? "animate-pulse bg-red-100 text-red-700"
                : warn
                  ? "bg-amber-100 text-amber-800"
                  : "bg-neutral-100 text-neutral-600"
          }`}
        >
          {isReady && order.readyAt
            ? pick(
                lang,
                `جاهز منذ ${minutesSince(order.readyAt, now)} د`,
                `prête depuis ${minutesSince(order.readyAt, now)} min`
              )
            : pick(lang, `${waited} د`, `${waited} min`)}
        </span>
      </div>

      <ul className="mt-3 flex flex-col gap-1.5 border-t border-neutral-100 pt-3">
        {order.items.map((item) => (
          <li key={item.id} className="text-base leading-snug text-neutral-900">
            <span className="font-semibold">{item.quantity}×</span>{" "}
            {pick(lang, item.nameAr, item.nameFr)}
            {item.size === "LARGE" && (
              <span className="ml-1 text-sm text-neutral-500">(L)</span>
            )}
            {!item.confirmed && (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
                {pick(lang, "جديد", "Nouveau")}
              </span>
            )}
            {item.optionsFr && (
              <span className="block pl-6 text-sm text-neutral-500">
                {pick(lang, item.optionsAr ?? "", item.optionsFr)}
              </span>
            )}
          </li>
        ))}
      </ul>

      {order.note && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {order.note}
        </p>
      )}

      {action && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => advanceOrderStatus(order.id, order.status))
          }
          className={`mt-4 min-h-[56px] w-full rounded-md px-4 text-base font-semibold transition-colors disabled:opacity-40 ${action.className}`}
        >
          {pick(lang, action.ar, action.fr)}
        </button>
      )}
    </div>
  );
}

export function KitchenBoard({ orders }: { orders: KitchenOrder[] }) {
  const { lang } = useLanguage();
  const router = useRouter();
  const muted = useSyncExternalStore(subscribeToMuted, readMuted, () => false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  function toggleMuted() {
    try {
      localStorage.setItem(SOUND_MUTED_KEY, muted ? "0" : "1");
    } catch {
      // ignore persistence failures
    }
    window.dispatchEvent(new Event(MUTED_CHANGE_EVENT));
  }

  useEffect(() => {
    const source = new EventSource("/api/orders/stream");
    source.onmessage = (event) => {
      const payload = JSON.parse(event.data) as OrderEvent;
      // A freshly confirmed order, or items added to one, is new work for the kitchen.
      const newWork =
        (payload.kind === "status_changed" && payload.status === "CONFIRMED") ||
        payload.kind === "items_added";
      if (newWork && !readMuted()) playChime(STAFF_ALERT);
      router.refresh();
    };
    // Catch up on anything missed while the connection was down.
    source.onopen = () => router.refresh();
    return () => source.close();
  }, [router]);

  const columns = KITCHEN_STATUSES.map((status) => ({
    status,
    orders: orders.filter((order) => order.status === status),
  }));

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {pick(lang, "المطبخ", "Cuisine")}
        </h1>
        <div className="flex items-center gap-2">
          <a
            href="/display"
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-neutral-300 px-3 py-2 text-xs text-neutral-600 hover:border-neutral-400"
          >
            📺 {pick(lang, "فتح شاشة الزبائن", "Ouvrir l'écran clients")}
          </a>
          <button
            type="button"
            onClick={toggleMuted}
            className="rounded-md border border-neutral-300 px-3 py-2 text-xs text-neutral-600 hover:border-neutral-400"
          >
            {muted
              ? pick(lang, "🔕 الصوت متوقف", "🔕 Son désactivé")
              : pick(lang, "🔔 الصوت مفعّل", "🔔 Son activé")}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {columns.map(({ status, orders: columnOrders }) => {
          const title = COLUMN_TITLE[status];
          return (
            <section
              key={status}
              className={`flex flex-col rounded-lg p-3 ${
                status === "READY" ? "bg-emerald-50" : "bg-neutral-100"
              }`}
            >
              <h2 className="mb-3 flex items-center justify-between px-1 text-sm font-semibold text-neutral-700">
                <span>
                  {ORDER_STATUS_LABEL[status].emoji} {pick(lang, title.ar, title.fr)}
                </span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-neutral-500">
                  {columnOrders.length}
                </span>
              </h2>
              <div className="flex flex-col gap-3">
                {columnOrders.map((order) => (
                  <KitchenCard key={order.id} order={order} now={now} />
                ))}
                {columnOrders.length === 0 && (
                  <p className="rounded-md border border-dashed border-neutral-300 px-3 py-8 text-center text-sm text-neutral-400">
                    {pick(lang, "لا شيء هنا", "Rien ici")}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
