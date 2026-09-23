import { EventEmitter } from "events";
import type { OrderStatus } from "@/lib/order-status";
import type {
  PaymentMethod,
  TableRequestStatus,
  TableRequestType,
} from "@/lib/table-requests";

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

export type TableRequestEvent = {
  requestId: string;
  tableNumber: string;
  type: TableRequestType;
  paymentMethod: PaymentMethod | null;
  status: TableRequestStatus;
};

const globalForOrderEvents = globalThis as unknown as {
  orderEvents: EventEmitter | undefined;
};

const EVENT_NAME = "order";
const TABLE_REQUEST_EVENT_NAME = "table-request";

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

export function emitTableRequestEvent(event: TableRequestEvent) {
  orderEvents.emit(TABLE_REQUEST_EVENT_NAME, event);
}

export function subscribeToTableRequestEvents(
  handler: (event: TableRequestEvent) => void
) {
  orderEvents.on(TABLE_REQUEST_EVENT_NAME, handler);
  return () => orderEvents.off(TABLE_REQUEST_EVENT_NAME, handler);
}
