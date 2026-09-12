"use client";

import { useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLanguage, pick } from "@/lib/language-context";
import { advanceOrderStatus, cancelOrder } from "@/app/actions/orders";
import {
  ORDER_STATUS_LABEL,
  nextOrderStatus,
  type OrderStatus,
} from "@/lib/order-status";

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

function OrderCard({ order }: { order: OrderView }) {
  const { lang } = useLanguage();
  const [pending, startTransition] = useTransition();
  const label = ORDER_STATUS_LABEL[order.status];
  const nextLabel = nextActionLabel(order.status, lang);

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4">
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
            {new Date(order.createdAt).toLocaleTimeString(
              lang === "ar" ? "ar" : "fr",
              { hour: "2-digit", minute: "2-digit" }
            )}
          </p>
        </div>
        <span className="whitespace-nowrap rounded-full bg-neutral-100 px-3 py-1 text-xs">
          {label.emoji} {pick(lang, label.ar, label.fr)}
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

export function OrdersBoard({
  initialOrders,
  stats,
}: {
  initialOrders: OrderView[];
  stats: OrdersStats;
}) {
  const { lang } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    const source = new EventSource("/api/orders/stream");
    source.onmessage = () => router.refresh();
    return () => source.close();
  }, [router]);

  const tables = useMemo(() => {
    const grouped = new Map<string, OrderView[]>();
    for (const order of initialOrders) {
      const list = grouped.get(order.tableNumber) ?? [];
      list.push(order);
      grouped.set(order.tableNumber, list);
    }
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [initialOrders]);

  const awaitingCount = initialOrders.filter((o) => o.status === "SENT").length;
  const occupiedTables = tables.length;
  const activeCount = initialOrders.length;

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        {pick(lang, "الطلبات", "Commandes")}
      </h1>

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

      {tables.length === 0 && (
        <p className="text-sm text-neutral-500">
          {pick(lang, "لا توجد طلبات حالياً", "Aucune commande en cours")}
        </p>
      )}

      <div className="flex flex-col gap-8">
        {tables.map(([tableNumber, orders]) => (
          <section key={tableNumber}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {pick(lang, "طاولة", "Table")} {tableNumber}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
