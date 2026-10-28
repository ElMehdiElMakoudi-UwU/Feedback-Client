"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useLanguage, pick } from "@/lib/language-context";
import { LanguageToggle } from "@/components/language-toggle";
import { formatOrderNumber, type OrderStatus } from "@/lib/order-status";
import { useOrderPush } from "@/lib/use-order-push";
import { playChime, PICKUP_ALERT } from "@/lib/sound";

type OrderLine = {
  id: string;
  nameAr: string;
  nameFr: string;
  size: string | null;
  optionsAr: string | null;
  optionsFr: string | null;
  quantity: number;
};

// What a driver needs to know, in four steps: is it in, is it cooking, can I
// come in, did I collect it. SENT and CONFIRMED both read as "received".
const DRIVER_STEPS = [
  { statuses: ["SENT", "CONFIRMED"], ar: "تم استلام الطلب", fr: "Commande reçue", emoji: "📥" },
  { statuses: ["PREPARING"], ar: "قيد التحضير", fr: "En préparation", emoji: "👨‍🍳" },
  { statuses: ["READY"], ar: "جاهز للاستلام", fr: "Prête à récupérer", emoji: "✅" },
  { statuses: ["COMPLETED"], ar: "تم الاستلام", fr: "Récupérée", emoji: "🛵" },
] as const;

function stepIndexOf(status: OrderStatus) {
  return DRIVER_STEPS.findIndex((step) =>
    (step.statuses as readonly string[]).includes(status)
  );
}

export function DriverTracker({
  orderId,
  orderNumber,
  trackingCode,
  guestName,
  total,
  initialStatus,
  items,
}: {
  orderId: string;
  orderNumber: number | null;
  trackingCode: string;
  guestName: string | null;
  total: number;
  initialStatus: OrderStatus;
  items: OrderLine[];
}) {
  const { lang } = useLanguage();
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const previousStatus = useRef<OrderStatus>(initialStatus);
  const { pushState, enablePushNotifications } = useOrderPush(orderId);

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
    if (status !== "READY") return;

    playChime(PICKUP_ALERT);
    navigator.vibrate?.([200, 100, 200]);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(pick(lang, "طلبك جاهز", "Commande prête"), {
        body: pick(
          lang,
          `الطلب ${formatOrderNumber(orderNumber)} جاهز، يمكنك المجيء لاستلامه`,
          `La commande ${formatOrderNumber(orderNumber)} est prête, vous pouvez venir la récupérer`
        ),
        icon: "/brand/icon-mark.png",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const isCancelled = status === "CANCELLED";
  const isReady = status === "READY";
  const currentStep = stepIndexOf(status);

  return (
    <main className="mx-auto min-h-screen max-w-md px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Image src="/brand/icon-mark.png" alt="" width={36} height={14} className="h-6 w-auto" />
          <span className="font-display text-lg tracking-wide">
            {pick(lang, "سندباد", "Sindibad")}
          </span>
        </span>
        <LanguageToggle />
      </div>

      <div
        className={`mb-6 rounded-md border p-6 text-center transition-colors ${
          isReady
            ? "border-green-500 bg-green-500/10"
            : "border-[var(--sindibad-line)] bg-[var(--sindibad-paper)]"
        }`}
      >
        <p className="text-xs uppercase tracking-widest text-[var(--sindibad-muted)]">
          {pick(lang, "رقم الطلب", "Commande n°")}
          {guestName ? ` · ${guestName}` : ""}
        </p>
        <p className="font-display text-7xl tracking-wide text-[var(--sindibad-ink)]">
          {formatOrderNumber(orderNumber)}
        </p>

        {isCancelled ? (
          <p className="font-display mt-4 text-2xl text-red-400">
            {pick(lang, "تم إلغاء الطلب", "Commande annulée")}
          </p>
        ) : (
          <>
            <p className="mt-4 text-5xl">{DRIVER_STEPS[currentStep].emoji}</p>
            <p
              className={`font-display mt-2 text-2xl tracking-wide ${
                isReady ? "text-green-400" : "text-[var(--sindibad-maroon)]"
              }`}
            >
              {pick(lang, DRIVER_STEPS[currentStep].ar, DRIVER_STEPS[currentStep].fr)}
            </p>
            <p className="mt-2 text-sm text-[var(--sindibad-muted)]">
              {isReady
                ? pick(
                    lang,
                    "يمكنك الدخول الآن لاستلام الطلب من الكونتوار",
                    "Vous pouvez entrer la récupérer au comptoir"
                  )
                : status === "COMPLETED"
                  ? pick(lang, "شكراً لك!", "Merci !")
                  : pick(
                      lang,
                      "لا داعي للانتظار في الداخل، ستتغير هذه الصفحة عندما يكون الطلب جاهزاً",
                      "Inutile d'attendre à l'intérieur : cette page change dès que la commande est prête"
                    )}
            </p>

            <ol className="mt-6 grid grid-cols-4 gap-1.5">
              {DRIVER_STEPS.map((step, index) => (
                <li key={step.fr} className="flex flex-col items-center gap-1.5">
                  <span
                    className={`h-2 w-full rounded-full ${
                      index <= currentStep
                        ? isReady
                          ? "bg-green-500"
                          : "bg-[var(--sindibad-maroon)]"
                        : "bg-[var(--sindibad-line)]"
                    }`}
                  />
                  <span className="text-[10px] leading-tight text-[var(--sindibad-muted)]">
                    {pick(lang, step.ar, step.fr)}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>

      {!isCancelled &&
        status !== "COMPLETED" &&
        (pushState === "unsubscribed" || pushState === "subscribing") && (
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
                  "نبهني عندما يكون الطلب جاهزاً",
                  "Me prévenir quand la commande est prête"
                )}
          </button>
        )}

      {pushState === "subscribed" && (
        <p className="mb-6 text-center text-xs text-[var(--sindibad-muted)]">
          🔔 {pick(lang, "الإشعارات مفعّلة", "Notifications activées")}
        </p>
      )}

      <div className="rounded-md border border-[var(--sindibad-line)] p-5">
        <div className="flex flex-col divide-y divide-[var(--sindibad-line)]">
          {items.map((item) => (
            <div key={item.id} className="py-2.5">
              <p className="text-sm text-[var(--sindibad-ink)]">
                <span className="mr-2 text-[var(--sindibad-muted)]">{item.quantity}×</span>
                {pick(lang, item.nameAr, item.nameFr)}
                {item.size === "LARGE" && (
                  <span className="ml-1 text-xs text-[var(--sindibad-muted)]">(L)</span>
                )}
              </p>
              {item.optionsFr && (
                <p className="text-xs text-[var(--sindibad-muted)]">
                  {pick(lang, item.optionsAr ?? "", item.optionsFr)}
                </p>
              )}
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

      <p className="mt-6 text-center font-mono text-xs tracking-widest text-[var(--sindibad-muted)]">
        {trackingCode}
      </p>
    </main>
  );
}
