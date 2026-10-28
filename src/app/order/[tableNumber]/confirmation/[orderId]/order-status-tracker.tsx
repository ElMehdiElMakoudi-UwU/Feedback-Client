"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLanguage, pick } from "@/lib/language-context";
import { LanguageToggle } from "@/components/language-toggle";
import {
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABEL,
  canAddItemsToOrder,
  formatOrderNumber,
  type OrderStatus,
} from "@/lib/order-status";
import { isTakeawayTable, isDeliveryTable } from "@/lib/order-mode";
import { useOrderPush } from "@/lib/use-order-push";
import { TableServiceButtons } from "@/components/table-service-buttons";
import type { PendingTableRequest } from "@/lib/table-requests";

type OrderLine = {
  id: string;
  nameAr: string;
  nameFr: string;
  size: string | null;
  optionsAr: string | null;
  optionsFr: string | null;
  unitPrice: number;
  quantity: number;
};

function playNotificationSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    [0, 0.18].forEach((offset) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.2, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.16);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.18);
    });

    setTimeout(() => ctx.close(), 500);
  } catch {
    // Ignore environments without Web Audio support.
  }
}

export function OrderStatusTracker({
  tableNumber,
  orderId,
  orderNumber,
  guestName,
  deliveryAddress,
  total,
  initialStatus,
  customerPhone,
  pendingTableRequests,
  items,
}: {
  tableNumber: string;
  orderId: string;
  orderNumber: number | null;
  guestName: string | null;
  deliveryAddress: string | null;
  total: number;
  initialStatus: OrderStatus;
  customerPhone: string | null;
  pendingTableRequests: PendingTableRequest[];
  items: OrderLine[];
}) {
  const { lang } = useLanguage();
  const isTakeaway = isTakeawayTable(tableNumber);
  const isDelivery = isDeliveryTable(tableNumber);
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [showToast, setShowToast] = useState(false);
  const { pushState, enablePushNotifications } = useOrderPush(orderId);
  const previousStatus = useRef<OrderStatus>(initialStatus);

  useEffect(() => {
    const source = new EventSource(`/api/orders/stream?orderId=${orderId}`);
    source.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { status: OrderStatus };
      setStatus(payload.status);
    };
    return () => source.close();
  }, [orderId]);

  useEffect(() => {
    if (status === previousStatus.current) return;
    previousStatus.current = status;

    playNotificationSound();

    setShowToast(true);
    const timeout = setTimeout(() => setShowToast(false), 4000);

    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      const newLabel = ORDER_STATUS_LABEL[status];
      new Notification(pick(lang, "تم تحديث حالة طلبك", "Statut de commande mis à jour"), {
        body: pick(lang, newLabel.ar, newLabel.fr),
        icon: "/brand/icon-mark.png",
      });
    }

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const label = ORDER_STATUS_LABEL[status];
  const isCancelled = status === "CANCELLED";
  const isCompleted = status === "COMPLETED";
  const stepIndex = ORDER_STATUS_FLOW.indexOf(status);

  return (
    <main className="mx-auto min-h-screen max-w-md px-6 py-10">
      {showToast && (
        <div
          role="status"
          className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-md border border-[var(--sindibad-line)] bg-[var(--sindibad-paper)] px-4 py-3 text-center shadow-lg"
        >
          <p className="text-sm text-[var(--sindibad-muted)]">
            {pick(lang, "تم تحديث حالة طلبك", "Statut de commande mis à jour")}
          </p>
          <p className="font-display text-base text-[var(--sindibad-maroon)]">
            {label.emoji} {pick(lang, label.ar, label.fr)}
          </p>
        </div>
      )}

      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/brand/icon-mark.png"
            alt=""
            width={36}
            height={14}
            className="h-6 w-auto"
          />
          <span className="font-display text-lg tracking-wide">
            {pick(lang, "سندباد", "Sindibad")}
          </span>
        </Link>
        <LanguageToggle />
      </div>

      <div className="mb-8 rounded-md border border-[var(--sindibad-line)] bg-[var(--sindibad-paper)] p-6 text-center">
        <p className="text-sm text-[var(--sindibad-muted)]">
          {isTakeaway
            ? pick(lang, "طلب خارجي", "Commande à emporter")
            : isDelivery
              ? pick(lang, "طلب توصيل", "Commande en livraison")
              : `${pick(lang, "طاولة رقم", "Table n°")} ${tableNumber}`}
          {guestName ? ` · ${guestName}` : ""}
        </p>
        {isDelivery && deliveryAddress && (
          <p className="mt-1 text-xs text-[var(--sindibad-muted)]">
            {deliveryAddress}
          </p>
        )}
        {orderNumber != null && (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-widest text-[var(--sindibad-muted)]">
              {pick(lang, "رقم طلبك", "Votre numéro")}
            </p>
            <p className="font-display text-6xl tracking-wide text-[var(--sindibad-ink)]">
              {formatOrderNumber(orderNumber)}
            </p>
          </div>
        )}
        <p className="mt-3 text-5xl">{label.emoji}</p>
        <p className="font-display mt-3 text-2xl tracking-wide text-[var(--sindibad-maroon)]">
          {pick(lang, label.ar, label.fr)}
        </p>

        {!isCancelled && (
          <div className="mt-6 flex items-center justify-center gap-2">
            {ORDER_STATUS_FLOW.map((step, index) => (
              <span
                key={step}
                className={`h-2 w-8 rounded-full ${
                  index <= stepIndex
                    ? "bg-[var(--sindibad-maroon)]"
                    : "bg-[var(--sindibad-line)]"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {(pushState === "unsubscribed" || pushState === "subscribing") && (
        <button
          type="button"
          onClick={enablePushNotifications}
          disabled={pushState === "subscribing"}
          className="font-display mb-6 block w-full rounded-md border border-dashed border-[var(--sindibad-line)] px-6 py-4 text-center text-sm tracking-wide text-[var(--sindibad-muted)] transition hover:border-[var(--sindibad-maroon)] hover:text-[var(--sindibad-maroon)] disabled:opacity-60"
        >
          🔔{" "}
          {pushState === "subscribing"
            ? pick(lang, "جارٍ التفعيل…", "Activation…")
            : pick(
                lang,
                "فعّل الإشعارات لمتابعة طلبك حتى وأنت خارج الصفحة",
                "Activer les notifications pour suivre ma commande même hors de la page"
              )}
        </button>
      )}

      {pushState === "subscribed" && (
        <p className="mb-6 text-center text-xs text-[var(--sindibad-muted)]">
          🔔 {pick(lang, "الإشعارات مفعّلة", "Notifications activées")}
        </p>
      )}

      {!isTakeaway && !isDelivery && !isCancelled && (
        <div className="mb-6">
          <TableServiceButtons
            tableNumber={tableNumber}
            initialPending={pendingTableRequests}
          />
        </div>
      )}

      <div className="rounded-md border border-[var(--sindibad-line)] p-5">
        <div className="flex flex-col divide-y divide-[var(--sindibad-line)]">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm text-[var(--sindibad-ink)]">
                  {pick(lang, item.nameAr, item.nameFr)}
                  {item.size === "LARGE" && (
                    <span className="ml-1 text-xs text-[var(--sindibad-muted)]">(L)</span>
                  )}
                  <span className="ml-2 text-xs text-[var(--sindibad-muted)]">
                    ×{item.quantity}
                  </span>
                </p>
                {item.optionsFr && (
                  <p className="text-xs text-[var(--sindibad-muted)]">
                    {pick(lang, item.optionsAr ?? "", item.optionsFr)}
                  </p>
                )}
              </div>
              <p className="text-sm text-[var(--sindibad-ink)]">
                {item.unitPrice * item.quantity} {pick(lang, "درهم", "DH")}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-[var(--sindibad-line)] pt-3">
          <p className="font-display text-lg">{pick(lang, "المجموع", "Total")}</p>
          <p className="font-display text-lg text-[var(--sindibad-maroon)]">
            {total} {pick(lang, "درهم", "DH")}
          </p>
        </div>
      </div>

      {canAddItemsToOrder(status) && (
        <Link
          href={`/order/${encodeURIComponent(tableNumber)}?addToOrder=${orderId}`}
          className="font-display mt-6 block rounded-md border border-[var(--sindibad-ink)] px-6 py-4 text-center text-base tracking-wide text-[var(--sindibad-ink)] transition hover:border-[var(--sindibad-maroon)] hover:text-[var(--sindibad-maroon)]"
        >
          {pick(lang, "إضافة صنف إلى الطلب", "Ajouter un article")}
        </Link>
      )}

      {isCompleted && (
        <Link
          href={`/feedback?table=${encodeURIComponent(tableNumber)}`}
          className="font-display mt-6 block rounded-md bg-[var(--sindibad-maroon)] px-6 py-4 text-center text-base tracking-wide text-white transition hover:opacity-90"
        >
          {pick(lang, "شاركونا رأيكم", "Laisser un avis")}
        </Link>
      )}

      {customerPhone && (
        <Link
          href={`/loyalty?phone=${encodeURIComponent(customerPhone)}`}
          className="font-display mt-6 block rounded-md border border-[var(--sindibad-ink)] px-6 py-4 text-center text-base tracking-wide text-[var(--sindibad-ink)] transition hover:border-[var(--sindibad-maroon)] hover:text-[var(--sindibad-maroon)]"
        >
          {pick(lang, "تتبعوا نقاط ولائكم", "Suivre mes points fidélité")}
        </Link>
      )}
    </main>
  );
}
