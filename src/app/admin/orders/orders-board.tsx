"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLanguage, pick } from "@/lib/language-context";
import { advanceOrderStatus, cancelOrder, confirmNewItems } from "@/app/actions/orders";
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
  confirmed: boolean;
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

type KpiIcon = "orders" | "tables" | "clock" | "alert" | "check" | "ban" | "cash";

function KpiIconGlyph({ icon }: { icon: KpiIcon }) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (icon) {
    case "orders":
      return (
        <svg {...props}>
          <path d="M4 7h16l-1.5 11a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2L4 7Z" />
          <path d="M9 7V5a3 3 0 0 1 6 0v2" />
        </svg>
      );
    case "tables":
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="4" rx="1" />
          <path d="M6 8v11M18 8v11" />
        </svg>
      );
    case "clock":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" />
        </svg>
      );
    case "alert":
      return (
        <svg {...props}>
          <path d="M12 3 2 20h20L12 3Z" />
          <path d="M12 10v4M12 17h.01" />
        </svg>
      );
    case "check":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12.5 2.5 2.5 4.5-5" />
        </svg>
      );
    case "ban":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="m6 6 12 12" />
        </svg>
      );
    case "cash":
      return (
        <svg {...props}>
          <rect x="2.5" y="6" width="19" height="12" rx="2" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M6.5 9v.01M17.5 15v.01" />
        </svg>
      );
  }
}

function KpiCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: KpiIcon;
  accent?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-4">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          accent
            ? "bg-[var(--sindibad-maroon)]/10 text-[var(--sindibad-maroon)]"
            : "bg-neutral-200/70 text-neutral-500"
        }`}
      >
        <span className="h-4.5 w-4.5 [&>svg]:h-[18px] [&>svg]:w-[18px]">
          <KpiIconGlyph icon={icon} />
        </span>
      </span>
      <div className="min-w-0">
        <p
          className={`text-2xl font-semibold tracking-tight ${
            accent ? "text-[var(--sindibad-maroon)]" : "text-neutral-900"
          }`}
        >
          {value}
        </p>
        <p className="mt-1 text-xs text-neutral-500">{label}</p>
      </div>
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

type OrderMode = "TABLE" | "TAKEAWAY" | "DELIVERY";

function orderMode(tableNumber: string): OrderMode {
  if (isTakeawayTable(tableNumber)) return "TAKEAWAY";
  if (isDeliveryTable(tableNumber)) return "DELIVERY";
  return "TABLE";
}

const WAIT_WARN_MINUTES = 5;
const WAIT_URGENT_MINUTES = 10;

function waitingMinutes(createdAt: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60000));
}

function WaitBadge({
  order,
  now,
  lang,
}: {
  order: OrderView;
  now: number;
  lang: "ar" | "fr";
}) {
  if (order.status !== "SENT") return null;
  const minutes = waitingMinutes(order.createdAt, now);
  const urgent = minutes >= WAIT_URGENT_MINUTES;
  const warn = minutes >= WAIT_WARN_MINUTES;
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${
        urgent
          ? "animate-pulse bg-red-100 text-red-700"
          : warn
            ? "bg-amber-100 text-amber-800"
            : "bg-neutral-100 text-neutral-500"
      }`}
    >
      {pick(lang, `${minutes} د`, `${minutes} min`)}
    </span>
  );
}

function OrderCard({
  order,
  highlighted,
  now,
}: {
  order: OrderView;
  highlighted?: boolean;
  now: number;
}) {
  const { lang } = useLanguage();
  const [pending, startTransition] = useTransition();
  const label = ORDER_STATUS_LABEL[order.status];
  const nextLabel = nextActionLabel(order.status, lang);
  const hasUnconfirmedItems = order.items.some((item) => !item.confirmed);

  return (
    <div
      id={`order-${order.id}`}
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
        <div className="flex shrink-0 items-center gap-1.5">
          <WaitBadge order={order} now={now} lang={lang} />
          <span className="whitespace-nowrap rounded-full bg-neutral-100 px-3 py-1 text-xs">
            {label.emoji}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1 border-t border-neutral-100 pt-3">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-sm">
            <span>
              {item.quantity}× {pick(lang, item.nameAr, item.nameFr)}
              {item.size === "LARGE" && (
                <span className="ml-1 text-xs text-neutral-500">(L)</span>
              )}
              {!item.confirmed && (
                <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                  {pick(lang, "جديد", "Nouveau")}
                </span>
              )}
            </span>
            <span className="text-neutral-600">
              {item.unitPrice * item.quantity} {pick(lang, "درهم", "DH")}
            </span>
          </div>
        ))}
      </div>

      {hasUnconfirmedItems && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-md bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-800">
            {pick(
              lang,
              "أضاف الزبون أصنافاً جديدة، يجب تأكيدها",
              "Le client a ajouté des articles, à reconfirmer"
            )}
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(() => confirmNewItems(order.id))
            }
            className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-40"
          >
            {pick(lang, "تأكيد الإضافة", "Confirmer l'ajout")}
          </button>
        </div>
      )}

      {(isDeliveryTable(order.tableNumber) ||
        isTakeawayTable(order.tableNumber)) && (
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
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<OrderMode | "ALL">("ALL");
  const [now, setNow] = useState(() => Date.now());
  const toastCounter = useRef(0);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

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

  const activeOrders = initialOrders.filter((o) => o.status !== "COMPLETED");
  const awaitingCount = initialOrders.filter((o) => o.status === "SENT").length;
  const urgentCount = initialOrders.filter(
    (o) => o.status === "SENT" && waitingMinutes(o.createdAt, now) >= WAIT_URGENT_MINUTES
  ).length;
  const occupiedTables = new Set(activeOrders.map((o) => o.tableNumber)).size;
  const activeCount = activeOrders.length;
  const totalCount = initialOrders.length;

  const modeCounts = useMemo(() => {
    const counts: Record<OrderMode, number> = { TABLE: 0, TAKEAWAY: 0, DELIVERY: 0 };
    for (const order of initialOrders) counts[orderMode(order.tableNumber)] += 1;
    return counts;
  }, [initialOrders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return initialOrders.filter((order) => {
      if (modeFilter !== "ALL" && orderMode(order.tableNumber) !== modeFilter) {
        return false;
      }
      if (!query) return true;
      const haystack = [
        order.tableNumber,
        order.guestName ?? "",
        order.customerPhone ?? "",
        order.deliveryAddress ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [initialOrders, search, modeFilter]);

  const columns = useMemo(() => {
    const grouped = new Map<OrderStatus, OrderView[]>();
    for (const status of KANBAN_STATUSES) grouped.set(status, []);
    for (const order of filteredOrders) {
      const list = grouped.get(order.status);
      if (list) list.push(order);
    }
    return KANBAN_STATUSES.map((status) => ({
      status,
      orders: grouped.get(status) ?? [],
    }));
  }, [filteredOrders]);

  const hasActiveFilters = search.trim() !== "" || modeFilter !== "ALL";
  const filteredCount = filteredOrders.length;

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

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <KpiCard
          icon="orders"
          label={pick(lang, "طلبات نشطة", "Commandes actives")}
          value={activeCount}
        />
        <KpiCard
          icon="tables"
          label={pick(lang, "طاولات مشغولة", "Tables occupées")}
          value={occupiedTables}
        />
        <KpiCard
          icon="clock"
          label={pick(lang, "بانتظار التأكيد", "En attente de confirmation")}
          value={awaitingCount}
          accent={awaitingCount > 0}
        />
        <KpiCard
          icon="alert"
          label={pick(lang, "طلبات متأخرة", "Commandes en retard")}
          value={urgentCount}
          accent={urgentCount > 0}
        />
        <KpiCard
          icon="check"
          label={pick(lang, "مكتملة اليوم", "Complétées aujourd'hui")}
          value={stats.completedToday}
        />
        <KpiCard
          icon="ban"
          label={pick(lang, "ملغاة اليوم", "Annulées aujourd'hui")}
          value={stats.cancelledToday}
        />
        <KpiCard
          icon="cash"
          label={pick(lang, "مبيعات اليوم", "Ventes du jour")}
          value={`${stats.revenueToday} ${pick(lang, "درهم", "DH")}`}
          accent
        />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={pick(
              lang,
              "بحث بالطاولة، الاسم أو الهاتف…",
              "Rechercher par table, nom ou téléphone…"
            )}
            className="w-full rounded-md border border-neutral-300 py-2 pl-9 pr-3 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: "ALL", ar: "الكل", fr: "Tout", count: totalCount },
              {
                key: "TABLE",
                ar: "طاولة",
                fr: "Sur place",
                count: modeCounts.TABLE,
              },
              {
                key: "TAKEAWAY",
                ar: "خارجي",
                fr: "À emporter",
                count: modeCounts.TAKEAWAY,
              },
              {
                key: "DELIVERY",
                ar: "توصيل",
                fr: "Livraison",
                count: modeCounts.DELIVERY,
              },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setModeFilter(option.key)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                modeFilter === option.key
                  ? "border-[var(--sindibad-maroon)] bg-[var(--sindibad-maroon)] text-white"
                  : "border-neutral-300 text-neutral-600 hover:border-neutral-400"
              }`}
            >
              {pick(lang, option.ar, option.fr)} · {option.count}
            </button>
          ))}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setModeFilter("ALL");
              }}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800"
            >
              {pick(lang, "✕ إلغاء التصفية", "✕ Effacer")}
            </button>
          )}
        </div>
      </div>

      {totalCount > 0 && (
        <div className="mb-4 flex gap-2 overflow-x-auto sm:hidden">
          {KANBAN_STATUSES.map((status) => {
            const columnLabel = ORDER_STATUS_LABEL[status];
            const count = columns.find((c) => c.status === status)?.orders.length ?? 0;
            return (
              <a
                key={status}
                href={`#column-${status}`}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600"
              >
                {columnLabel.emoji} {pick(lang, columnLabel.ar, columnLabel.fr)}
                <span className="rounded-full bg-neutral-100 px-1.5 text-neutral-500">
                  {count}
                </span>
              </a>
            );
          })}
        </div>
      )}

      {totalCount === 0 && (
        <p className="text-sm text-neutral-500">
          {pick(lang, "لا توجد طلبات حالياً", "Aucune commande en cours")}
        </p>
      )}

      {totalCount > 0 && filteredCount === 0 && (
        <p className="rounded-md border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">
          {pick(
            lang,
            "لا توجد نتائج مطابقة لبحثك",
            "Aucune commande ne correspond à votre recherche"
          )}
        </p>
      )}

      {totalCount > 0 && filteredCount > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(({ status, orders }) => {
            const columnLabel = ORDER_STATUS_LABEL[status];
            return (
              <section
                key={status}
                id={`column-${status}`}
                className="flex w-72 shrink-0 scroll-mt-4 flex-col rounded-lg bg-neutral-100 sm:w-80"
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
                      now={now}
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
