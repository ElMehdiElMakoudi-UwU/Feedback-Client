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
  SENT: { fr: "Commande envoyée", ar: "تم إرسال الطلب", emoji: "🛥️" },
  CONFIRMED: { fr: "Confirmée", ar: "تم تأكيد الطلب", emoji: "✅" },
  PREPARING: { fr: "En pleine mer", ar: "الطلب في طريقه للتحضير", emoji: "⛵" },
  READY: { fr: "Arrivée à bon port", ar: "وصل الطلب", emoji: "🏝️" },
  COMPLETED: { fr: "Voyage terminé", ar: "اكتملت الرحلة", emoji: "🎉" },
  CANCELLED: { fr: "Annulée", ar: "تم إلغاء الطلب", emoji: "⚓" },
};

export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  const index = ORDER_STATUS_FLOW.indexOf(status);
  if (index === -1 || index === ORDER_STATUS_FLOW.length - 1) return null;
  return ORDER_STATUS_FLOW[index + 1];
}
