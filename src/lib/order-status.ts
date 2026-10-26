export const ORDER_STATUSES = [
  "SENT",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Linear happy path; CANCELLED is reachable from any non-terminal status.
// CONFIRMED (cashier) → PREPARING → READY (kitchen) → COMPLETED (handed over).
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "SENT",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "COMPLETED",
];

export const ORDER_STATUS_LABEL: Record<
  OrderStatus,
  { ar: string; fr: string; emoji: string }
> = {
  SENT: { fr: "Nouvelle commande", ar: "طلب جديد", emoji: "🆕" },
  CONFIRMED: { fr: "Commande confirmée", ar: "تم تأكيد الطلب", emoji: "✅" },
  PREPARING: { fr: "En préparation", ar: "قيد التحضير", emoji: "👨‍🍳" },
  READY: { fr: "Commande prête", ar: "الطلب جاهز", emoji: "🔔" },
  COMPLETED: { fr: "Commande terminée", ar: "تم إنجاز الطلب", emoji: "🎉" },
  CANCELLED: { fr: "Annulée", ar: "تم إلغاء الطلب", emoji: "⚓" },
};

// Statuses the kitchen screen works on, in board order.
export const KITCHEN_STATUSES: OrderStatus[] = ["CONFIRMED", "PREPARING", "READY"];

export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  const index = ORDER_STATUS_FLOW.indexOf(status);
  if (index === -1 || index === ORDER_STATUS_FLOW.length - 1) return null;
  return ORDER_STATUS_FLOW[index + 1];
}

// Once the food is ready (or the order is closed), the kitchen is done with it — no more additions.
export function canAddItemsToOrder(status: OrderStatus): boolean {
  return status === "SENT" || status === "CONFIRMED" || status === "PREPARING";
}

// The ticket number guests see on the pickup display and their confirmation page.
export function formatOrderNumber(number: number | null): string | null {
  return number == null ? null : String(number).padStart(3, "0");
}
