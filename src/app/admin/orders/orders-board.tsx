"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLanguage, pick } from "@/lib/language-context";
import { advanceOrderStatus, cancelOrder } from "@/app/actions/orders";
import {
  ORDER_STATUS_LABEL,
  nextOrderStatus,
  type OrderStatus,
} from "@/lib/order-status";
import { isTakeawayTable, isDeliveryTable } from "@/lib/order-mode";
import type { OrderEvent } from "@/lib/order-events";

type OrderLine = {
  id: string;
  nameAr: string;
  nameFr: string;
  size: string | null;
  unitPrice: number;
  quantity: number;
};

type OrderView = {
  id: string;
  tableNumber: string;
  guestName: string | null;
  deliveryAddress: string | null;
  customerPhone: string | null;
  note: string | null;
  total: number;
  status: OrderStatus;
  createdAt: string;
  items: OrderLine[];
  hasLoyaltyPhone: boolean;
};

type OrdersStats = {
  revenueToday: number;
  completedToday: number;
  cancelledToday: number;
};

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
      <p
        className={`text-2xl font-semibold tracking-tight ${
          accent ? "text-[var(--sindibad-maroon)]" : "text-neutral-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-neutral-500">{label}</p>
    </div>
  );
}

function nextActionLabel(status: OrderStatus, lang: "ar" | "fr") {
  const next = nextOrderStatus(status);
  if (!next) return null;
  return pick(
    lang,
    `${ORDER_STATUS_LABEL[next].emoji} ${ORDER_STATUS_LABEL[next].ar}`,
    `${ORDER_STATUS_LABEL[next].emoji} ${ORDER_STATUS_LABEL[next].fr}`
  );
}

function OrderCard({
  order,
  highlighted,
}: {
  order: OrderView;
  highlighted?: boolean;
}) {
  const { lang } = useLanguage();
  const [pending, startTransition] = useTransition();
  const label = ORDER_STATUS_LABEL[order.status];
  const nextLabel = nextActionLabel(order.status, lang);

  return (
    <div
      className={`rounded-md border bg-white p-4 transition-shadow ${
        highlighted
          ? "animate-pulse border-[var(--sindibad-maroon)] ring-2 ring-[var(--sindibad-maroon)]"
          : "border-neutral-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-neutral-900">
            {order.guestName || pick(lang, "زبون", "Client")}
            {order.hasLoyaltyPhone && (
              <span
                title={pick(
                  lang,
                  "سيحصل على نقاط الولاء عند التأكيد",
                  "Points fidélité ajoutés automatiquement à la confirmation"
                )}
                className="ml-1"
              >
                🎁
              </span>
            )}
          </p>
          <p className="text-xs text-neutral-500">
            {isTakeawayTable(order.tableNumber)
              ? pick(lang, "طلب خارجي", "À emporter")
              : isDeliveryTable(order.tableNumber)
                ? pick(lang, "توصيل", "Livraison")
                : `${pick(lang, "طاولة", "Table")} ${order.tableNumber}`}
            {" · "}
            {new Date(order.createdAt).toLocaleTimeString(
              lang === "ar" ? "ar" : "fr",
              { hour: "2-digit", minute: "2-digit" }
            )}
          </p>
        </div>
        <span className="whitespace-nowrap rounded-full bg-neutral-100 px-3 py-1 text-xs">
          {label.emoji}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-1 border-t border-neutral-100 pt-3">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-sm">
            <span>
              {item.quantity}× {pick(lang, item.nameAr, item.nameFr)}
              {item.size === "LARGE" && (
                <span className="ml-1 text-xs text-neutral-500">(L)</span>
              )}
            </span>
            <span className="text-neutral-600">
              {item.unitPrice * item.quantity} {pick(lang, "درهم", "DH")}
            </span>
          </div>
        ))}
      </div>

      {isDeliveryTable(order.tableNumber) && (
        <div className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-900">
          {order.customerPhone && (
            <p className="font-medium">
              {pick(lang, "الهاتف", "Téléphone")}: {order.customerPhone}
            </p>
          )}
          {order.deliveryAddress && (
            <p className="mt-0.5">
              {pick(lang, "العنوان", "Adresse")}: {order.deliveryAddress}
            </p>
          )}
        </div>
      )}

      {order.note && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {order.note}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
        <p className="text-sm font-medium">
          {pick(lang, "المجموع", "Total")}: {order.total} {pick(lang, "درهم", "DH")}
        </p>
        <div className="flex gap-2">
          {order.status !== "COMPLETED" && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(() => cancelOrder(order.id))
              }
              className="rounded-md border border-neutral-300 px-3 py-2 text-xs text-neutral-600 hover:border-red-400 hover:text-red-700 disabled:opacity-40"
            >
              {pick(lang, "إلغاء", "Annuler")}
            </button>
          )}
          {nextLabel && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(() => advanceOrderStatus(order.id, order.status))
              }
              className="rounded-md bg-neutral-900 px-3 py-2 text-xs text-white hover:bg-neutral-700 disabled:opacity-40"
            >
              {nextLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const SOUND_MUTED_KEY = "sindibad-admin-sound-muted";

function playNotificationChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    [880, 1320].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      const start = now + index * 0.15;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.4);
    });

    setTimeout(() => ctx.close(), 1000);
  } catch {
    // Audio isn't critical to the order flow — ignore playback failures.
  }
}

const KANBAN_STATUSES: OrderStatus[] = ["SENT", "CONFIRMED", "COMPLETED"];

type Toast = { id: number; text: string };

export function OrdersBoard({
  initialOrders,
  stats,
}: {
  initialOrders: OrderView[];
  stats: OrdersStats;
}) {
  const { lang } = useLanguage();
  const router = useRouter();
  const [muted, setMuted] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [highlightedOrderIds, setHighlightedOrderIds] = useState<Set<string>>(
    new Set()
  );
  const toastCounter = useRef(0);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    try {
      setMuted(localStorage.getItem(SOUND_MUTED_KEY) === "1");
    } catch {
      // localStorage unavailable — keep sound on by default.
    }
  }, []);

  function toggleMuted() {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SOUND_MUTED_KEY, next ? "1" : "0");
      } catch {
        // ignore persistence failures
      }
      return next;
    });
  }

  const notify = useCallback(
    (text: string, orderId: string) => {
      const id = ++toastCounter.current;
      setToasts((prev) => [...prev, { id, text }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 6000);

      setHighlightedOrderIds((prev) => new Set(prev).add(orderId));
      setTimeout(() => {
        setHighlightedOrderIds((prev) => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
      }, 8000);

      if (!mutedRef.current) playNotificationChime();
    },
    []
  );

  useEffect(() => {
    const source = new EventSource("/api/orders/stream");
    source.onmessage = (event) => {
      const payload = JSON.parse(event.data) as OrderEvent;
      if (payload.kind === "created" || payload.kind === "items_added") {
        const tableLabel = isTakeawayTable(payload.tableNumber)
          ? pick(lang, "طلب خارجي", "à emporter")
          : `${pick(lang, "طاولة", "table")} ${payload.tableNumber}`;
        const text =
          payload.kind === "created"
            ? pick(lang, `طلب جديد - ${tableLabel} 🔔`, `Nouvelle commande - ${tableLabel} 🔔`)
            : pick(
                lang,
                `تمت إضافة صنف - ${tableLabel} ➕`,
                `Article ajouté - ${tableLabel} ➕`
              );
        notify(text, payload.orderId);
      }
      router.refresh();
    };
    return () => source.close();
  }, [router, lang, notify]);

  const columns = useMemo(() => {
    const grouped = new Map<OrderStatus, OrderView[]>();
    for (const status of KANBAN_STATUSES) grouped.set(status, []);
    for (const order of initialOrders) {
      const list = grouped.get(order.status);
      if (list) list.push(order);
    }
    return KANBAN_STATUSES.map((status) => ({
      status,
      orders: grouped.get(status) ?? [],
    }));
  }, [initialOrders]);

  const activeOrders = initialOrders.filter((o) => o.status !== "COMPLETED");
  const awaitingCount = initialOrders.filter((o) => o.status === "SENT").length;
  const occupiedTables = new Set(activeOrders.map((o) => o.tableNumber)).size;
  const activeCount = activeOrders.length;
  const totalCount = initialOrders.length;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto rounded-md border border-[var(--sindibad-maroon)] bg-white px-4 py-3 text-sm font-medium text-[var(--sindibad-maroon)] shadow-lg"
          >
            {toast.text}
          </div>
        ))}
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {pick(lang, "الطلبات", "Commandes")}
        </h1>
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

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label={pick(lang, "طلبات نشطة", "Commandes actives")}
          value={activeCount}
        />
        <KpiCard
          label={pick(lang, "طاولات مشغولة", "Tables occupées")}
          value={occupiedTables}
        />
        <KpiCard
          label={pick(lang, "بانتظار التأكيد", "En attente de confirmation")}
          value={awaitingCount}
          accent={awaitingCount > 0}
        />
        <KpiCard
          label={pick(lang, "مكتملة اليوم", "Complétées aujourd'hui")}
          value={stats.completedToday}
        />
        <KpiCard
          label={pick(lang, "ملغاة اليوم", "Annulées aujourd'hui")}
          value={stats.cancelledToday}
        />
        <KpiCard
          label={pick(lang, "مبيعات اليوم", "Ventes du jour")}
          value={`${stats.revenueToday} ${pick(lang, "درهم", "DH")}`}
          accent
        />
      </div>

      {totalCount === 0 && (
        <p className="text-sm text-neutral-500">
          {pick(lang, "لا توجد طلبات حالياً", "Aucune commande en cours")}
        </p>
      )}

      {totalCount > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(({ status, orders }) => {
            const columnLabel = ORDER_STATUS_LABEL[status];
            return (
              <section
                key={status}
                className="flex w-72 shrink-0 flex-col rounded-lg bg-neutral-100 sm:w-80"
              >
                <h2 className="flex items-center justify-between gap-2 px-3 pt-3 pb-2 text-sm font-semibold text-neutral-700">
                  <span>
                    {columnLabel.emoji}{" "}
                    {pick(lang, columnLabel.ar, columnLabel.fr)}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-neutral-500">
                    {orders.length}
                  </span>
                </h2>
                <div className="flex max-h-[calc(100vh-260px)] flex-col gap-3 overflow-y-auto px-3 pb-3">
                  {orders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      highlighted={highlightedOrderIds.has(order.id)}
                    />
                  ))}
                  {orders.length === 0 && (
                    <p className="rounded-md border border-dashed border-neutral-300 px-3 py-6 text-center text-xs text-neutral-400">
                      {pick(lang, "لا شيء هنا", "Rien ici")}
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
