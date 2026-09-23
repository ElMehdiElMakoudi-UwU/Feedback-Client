export const TABLE_REQUEST_TYPES = ["WAITER", "BILL", "MANAGER"] as const;
export type TableRequestType = (typeof TABLE_REQUEST_TYPES)[number];

// MANAGER requests are only raised server-side by a low feedback rating.
export const GUEST_TABLE_REQUEST_TYPES = ["WAITER", "BILL"] as const;
export type GuestTableRequestType = (typeof GUEST_TABLE_REQUEST_TYPES)[number];

export const PAYMENT_METHODS = ["CASH", "CARD"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type TableRequestStatus = "PENDING" | "DONE";

// A pending request older than this is treated as stale (e.g. a guest who
// left before staff cleared it), so the next guest at that table can call again.
export const TABLE_REQUEST_REUSE_WINDOW_MS = 2 * 60 * 60 * 1000;

export type PendingTableRequest = {
  id: string;
  type: TableRequestType;
  paymentMethod: PaymentMethod | null;
};

export const TABLE_REQUEST_LABEL: Record<
  TableRequestType,
  { ar: string; fr: string; emoji: string }
> = {
  WAITER: { ar: "طلب نادل", fr: "Appel serveur", emoji: "🙋" },
  BILL: { ar: "طلب الحساب", fr: "Demande d'addition", emoji: "🧾" },
  MANAGER: { ar: "تقييم منخفض · المسؤول مطلوب", fr: "Avis négatif · responsable demandé", emoji: "⚠️" },
};

export const PAYMENT_METHOD_LABEL: Record<
  PaymentMethod,
  { ar: string; fr: string; emoji: string }
> = {
  CASH: { ar: "نقداً", fr: "Espèces", emoji: "💵" },
  CARD: { ar: "بالبطاقة", fr: "Carte", emoji: "💳" },
};
