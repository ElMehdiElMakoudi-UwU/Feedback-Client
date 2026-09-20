import { EventEmitter } from "events";
import type { OrderStatus } from "@/lib/order-status";

export type OrderEventKind =
  | "created"
  | "items_added"
  | "items_confirmed"
  | "status_changed";

export type OrderEvent = {
  orderId: string;
  tableNumber: string;
  status: OrderStatus;
  kind: OrderEventKind;
};

const globalForOrderEvents = globalThis as unknown as {
  orderEvents: EventEmitter | undefined;
};

const EVENT_NAME = "order";

export const orderEvents =
  globalForOrderEvents.orderEvents ?? new EventEmitter().setMaxListeners(0);

// Always pin this to globalThis, not just outside production: Next's
// standalone output compiles each route/Server Action into its own bundle,
// so without a shared globalThis instance, `emitOrderEvent` (called from the
// placeOrder Server Action's bundle) and `subscribeToOrderEvents` (called
// from the /api/orders/stream route's bundle) can end up on two separate
// EventEmitter instances in the same process and never see each other's
// events — orders persist fine, but the SSE stream never fires.
globalForOrderEvents.orderEvents = orderEvents;

export function emitOrderEvent(event: OrderEvent) {
  orderEvents.emit(EVENT_NAME, event);
}

export function subscribeToOrderEvents(handler: (event: OrderEvent) => void) {
  orderEvents.on(EVENT_NAME, handler);
  return () => orderEvents.off(EVENT_NAME, handler);
}
