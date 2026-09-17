import { EventEmitter } from "events";
import type { OrderStatus } from "@/lib/order-status";

export type OrderEventKind = "created" | "items_added" | "status_changed";

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

if (process.env.NODE_ENV !== "production")
  globalForOrderEvents.orderEvents = orderEvents;

export function emitOrderEvent(event: OrderEvent) {
  orderEvents.emit(EVENT_NAME, event);
}

export function subscribeToOrderEvents(handler: (event: OrderEvent) => void) {
  orderEvents.on(EVENT_NAME, handler);
  return () => orderEvents.off(EVENT_NAME, handler);
}
