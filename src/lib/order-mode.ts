export const TAKEAWAY_TABLE_VALUE = "TAKEAWAY";
export const DELIVERY_TABLE_VALUE = "DELIVERY";

export function isTakeawayTable(tableNumber: string) {
  return tableNumber === TAKEAWAY_TABLE_VALUE;
}

export function isDeliveryTable(tableNumber: string) {
  return tableNumber === DELIVERY_TABLE_VALUE;
}
