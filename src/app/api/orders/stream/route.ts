import { getStaffSession } from "@/lib/require-admin";
import {
  subscribeToOrderEvents,
  subscribeToTableRequestEvents,
  type OrderEvent,
  type TableRequestEvent,
} from "@/lib/order-events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  const tableRequestId = searchParams.get("tableRequestId");

  // Customers may follow their own order or table request; the unfiltered
  // stream (every order and table call) is staff-only.
  if (!orderId && !tableRequestId) {
    const staff = await getStaffSession();
    if (!staff) return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: OrderEvent) => {
        if (tableRequestId) return;
        if (orderId && event.orderId !== orderId) return;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };

      // Sent as a named SSE event so existing `onmessage` listeners, which
      // expect an OrderEvent payload, never see it.
      const sendTableRequest = (event: TableRequestEvent) => {
        if (orderId) return;
        if (tableRequestId && event.requestId !== tableRequestId) return;
        controller.enqueue(
          encoder.encode(
            `event: table-request\ndata: ${JSON.stringify(event)}\n\n`
          )
        );
      };

      const unsubscribeOrders = subscribeToOrderEvents(send);
      const unsubscribeTableRequests =
        subscribeToTableRequestEvents(sendTableRequest);

      // Reverse proxies (nginx, etc.) idle-timeout a connection with no
      // traffic, silently killing the stream without the client noticing.
      // A periodic comment keeps it alive and flushing through any buffer.
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      }, 20000);

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribeOrders();
        unsubscribeTableRequests();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Tell nginx-style reverse proxies not to buffer this streaming
      // response — otherwise events sit in the proxy's buffer instead of
      // reaching the client until it closes, so updates only appear after
      // a manual refresh. See Next.js self-hosting docs > Streaming and
      // Suspense.
      "X-Accel-Buffering": "no",
    },
  });
}
