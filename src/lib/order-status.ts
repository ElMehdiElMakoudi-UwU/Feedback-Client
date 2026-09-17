export const ORDER_STATUSES = [
  "SENT",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Linear happy path; CANCELLED is reachable from any non-terminal status.
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "SENT",
  "CONFIRMED",
  "COMPLETED",
];

export const ORDER_STATUS_LABEL: Record<
  OrderStatus,
  { ar: string; fr: string; emoji: string }
> = {
  SENT: { fr: "Nouvelle commande", ar: "طلب جديد", emoji: "🆕" },
  CONFIRMED: { fr: "Commande confirmée", ar: "تم تأكيد الطلب", emoji: "✅" },
  COMPLETED: { fr: "Commande terminée", ar: "تم إنجاز الطلب", emoji: "🎉" },
  CANCELLED: { fr: "Annulée", ar: "تم إلغاء الطلب", emoji: "⚓" },
};

export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  const index = ORDER_STATUS_FLOW.indexOf(status);
  if (index === -1 || index === ORDER_STATUS_FLOW.length - 1) return null;
  return ORDER_STATUS_FLOW[index + 1];
}

// Once an order is COMPLETED or CANCELLED, the kitchen is done with it — no more additions.
export function canAddItemsToOrder(status: OrderStatus): boolean {
  return status !== "COMPLETED" && status !== "CANCELLED";
}
