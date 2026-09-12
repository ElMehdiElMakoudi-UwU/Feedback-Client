"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage, pick } from "@/lib/language-context";
import { LanguageToggle } from "@/components/language-toggle";
import {
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABEL,
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

export function OrderStatusTracker({
  tableNumber,
  orderId,
  guestName,
  total,
  initialStatus,
  items,
}: {
  tableNumber: string;
  orderId: string;
  guestName: string | null;
  total: number;
  initialStatus: OrderStatus;
  items: OrderLine[];
}) {
  const { lang } = useLanguage();
  const [status, setStatus] = useState<OrderStatus>(initialStatus);

  useEffect(() => {
    const source = new EventSource(`/api/orders/stream?orderId=${orderId}`);
    source.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { status: OrderStatus };
      setStatus(payload.status);
    };
    return () => source.close();
  }, [orderId]);

  const label = ORDER_STATUS_LABEL[status];
  const isCancelled = status === "CANCELLED";
  const stepIndex = ORDER_STATUS_FLOW.indexOf(status);

  return (
    <main className="mx-auto min-h-screen max-w-md px-6 py-10">
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
          {pick(lang, "طاولة رقم", "Table n°")} {tableNumber}
          {guestName ? ` · ${guestName}` : ""}
        </p>
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
    </main>
  );
}
