import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PickupDisplay, type DisplayOrder } from "./pickup-display";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sindibad — Commandes",
};

// A ready order stays on screen this long if nobody marks it handed over.
const READY_VISIBLE_MINUTES = 30;

// Public screen hung above the counter: no login, so it only ever receives
// the ticket number, the guest's first name and the status — no order ids,
// tables, phones or items.
export default async function DisplayPage() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const readyCutoff = new Date(now.getTime() - READY_VISIBLE_MINUTES * 60000);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: todayStart },
      number: { not: null },
      OR: [
        { status: { in: ["CONFIRMED", "PREPARING"] } },
        { status: "READY", readyAt: { gte: readyCutoff } },
      ],
    },
    orderBy: { number: "asc" },
    select: { number: true, guestName: true, status: true, readyAt: true },
  });

  const displayOrders: DisplayOrder[] = orders.map((order) => ({
    number: order.number!,
    name: order.guestName?.trim().split(/\s+/)[0] || null,
    ready: order.status === "READY",
    readyAt: order.readyAt?.toISOString() ?? null,
  }));

  return <PickupDisplay orders={displayOrders} />;
}
