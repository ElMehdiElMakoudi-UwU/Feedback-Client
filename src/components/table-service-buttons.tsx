"use client";

import { useEffect, useState, useTransition } from "react";
import { useLanguage, pick } from "@/lib/language-context";
import { createTableRequest } from "@/app/actions/table-requests";
import type { TableRequestEvent } from "@/lib/order-events";
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHODS,
  TABLE_REQUEST_LABEL,
  type PaymentMethod,
  type PendingTableRequest,
  type TableRequestType,
} from "@/lib/table-requests";

// How long the "on the way" confirmation stays up after staff clear a request.
const ACKNOWLEDGED_DISPLAY_MS = 8000;

type RequestState =
  | { phase: "idle" }
  | { phase: "pending"; requestId: string; paymentMethod: PaymentMethod | null }
  | { phase: "acknowledged" };

function initialState(
  pending: PendingTableRequest[],
  type: TableRequestType
): RequestState {
  const request = pending.find((r) => r.type === type);
  return request
    ? { phase: "pending", requestId: request.id, paymentMethod: request.paymentMethod }
    : { phase: "idle" };
}

function useRequestUpdates(
  state: RequestState,
  setState: (state: RequestState) => void
) {
  const requestId = state.phase === "pending" ? state.requestId : null;

  useEffect(() => {
    if (!requestId) return;
    const source = new EventSource(
      `/api/orders/stream?tableRequestId=${encodeURIComponent(requestId)}`
    );
    source.addEventListener("table-request", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as TableRequestEvent;
      if (payload.status === "DONE") {
        setState({ phase: "acknowledged" });
      } else {
        setState({
          phase: "pending",
          requestId: payload.requestId,
          paymentMethod: payload.paymentMethod,
        });
      }
    });
    return () => source.close();
  }, [requestId, setState]);

  useEffect(() => {
    if (state.phase !== "acknowledged") return;
    const timeout = setTimeout(
      () => setState({ phase: "idle" }),
      ACKNOWLEDGED_DISPLAY_MS
    );
    return () => clearTimeout(timeout);
  }, [state.phase, setState]);
}

export function TableServiceButtons({
  tableNumber,
  initialPending,
}: {
  tableNumber: string;
  initialPending: PendingTableRequest[];
}) {
  const { lang } = useLanguage();
  const [pending, startTransition] = useTransition();
  const [waiter, setWaiter] = useState<RequestState>(() =>
    initialState(initialPending, "WAITER")
  );
  const [bill, setBill] = useState<RequestState>(() =>
    initialState(initialPending, "BILL")
  );
  const [choosingPayment, setChoosingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useRequestUpdates(waiter, setWaiter);
  useRequestUpdates(bill, setBill);

  function send(type: TableRequestType, paymentMethod?: PaymentMethod) {
    setError(null);
    startTransition(async () => {
      const result = await createTableRequest({ tableNumber, type, paymentMethod });
      if (result.status === "error") {
        setError(
          pick(lang, "تعذر إرسال الطلب، حاولوا مجدداً", "Envoi impossible, réessayez")
        );
        return;
      }
      const next: RequestState = {
        phase: "pending",
        requestId: result.requestId,
        paymentMethod: paymentMethod ?? null,
      };
      if (type === "WAITER") setWaiter(next);
      else {
        setBill(next);
        setChoosingPayment(false);
      }
    });
  }

  const waiterLabel = TABLE_REQUEST_LABEL.WAITER;
  const billLabel = TABLE_REQUEST_LABEL.BILL;

  return (
    <section
      aria-label={pick(lang, "خدمة الطاولة", "Service à table")}
      className="flex flex-col gap-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={pending || waiter.phase === "pending"}
          onClick={() => send("WAITER")}
          className="flex flex-col items-center gap-1 rounded-md border border-[var(--sindibad-line)] bg-[var(--sindibad-paper)] px-3 py-4 text-center transition hover:border-[var(--sindibad-maroon)] disabled:cursor-default disabled:hover:border-[var(--sindibad-line)]"
        >
          <span className="text-2xl" aria-hidden>
            {waiter.phase === "acknowledged" ? "✅" : waiterLabel.emoji}
          </span>
          <span className="font-display text-base tracking-wide text-[var(--sindibad-ink)]">
            {pick(lang, "نادوا النادل", "Appeler un serveur")}
          </span>
          <StatusLine state={waiter} lang={lang} />
        </button>

        <button
          type="button"
          disabled={pending || bill.phase === "pending"}
          onClick={() => setChoosingPayment((open) => !open)}
          aria-expanded={choosingPayment}
          className="flex flex-col items-center gap-1 rounded-md border border-[var(--sindibad-line)] bg-[var(--sindibad-paper)] px-3 py-4 text-center transition hover:border-[var(--sindibad-maroon)] disabled:cursor-default disabled:hover:border-[var(--sindibad-line)]"
        >
          <span className="text-2xl" aria-hidden>
            {bill.phase === "acknowledged" ? "✅" : billLabel.emoji}
          </span>
          <span className="font-display text-base tracking-wide text-[var(--sindibad-ink)]">
            {pick(lang, "اطلبوا الحساب", "Demander l'addition")}
          </span>
          <StatusLine
            state={bill}
            lang={lang}
            detail={
              bill.phase === "pending" && bill.paymentMethod
                ? pick(
                    lang,
                    PAYMENT_METHOD_LABEL[bill.paymentMethod].ar,
                    PAYMENT_METHOD_LABEL[bill.paymentMethod].fr
                  )
                : undefined
            }
          />
        </button>
      </div>

      {choosingPayment && bill.phase !== "pending" && (
        <div className="rounded-md border border-[var(--sindibad-line)] p-4">
          <p className="mb-3 text-center text-sm text-[var(--sindibad-muted)]">
            {pick(lang, "كيف تفضلون الدفع؟", "Comment souhaitez-vous payer ?")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {PAYMENT_METHODS.map((method) => {
              const label = PAYMENT_METHOD_LABEL[method];
              return (
                <button
                  key={method}
                  type="button"
                  disabled={pending}
                  onClick={() => send("BILL", method)}
                  className="font-display rounded-md bg-[var(--sindibad-ink)] px-4 py-3 text-base tracking-wide text-[var(--sindibad-cream)] transition hover:bg-[var(--sindibad-maroon)] disabled:opacity-60"
                >
                  {label.emoji} {pick(lang, label.ar, label.fr)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-center text-sm text-[var(--sindibad-maroon)]">
          {error}
        </p>
      )}
    </section>
  );
}

function StatusLine({
  state,
  lang,
  detail,
}: {
  state: RequestState;
  lang: "ar" | "fr";
  detail?: string;
}) {
  if (state.phase === "idle") return null;
  const text =
    state.phase === "pending"
      ? pick(lang, "تم إرسال الطلب", "Demande envoyée")
      : pick(lang, "النادل قادم إليكم", "Un serveur arrive");
  return (
    <span role="status" className="text-xs text-[var(--sindibad-maroon)]">
      {text}
      {detail ? ` · ${detail}` : ""}
    </span>
  );
}
