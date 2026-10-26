import { requireStaff } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { KITCHEN_STATUSES, type OrderStatus } from "@/lib/order-status";
import { KitchenBoard } from "./kitchen-board";

export const dynamic = "force-dynamic";

export default async function AdminKitchenPage() {
  await requireStaff();

  const orders = await prisma.order.findMany({
    where: { status: { in: KITCHEN_STATUSES } },
    orderBy: { createdAt: "asc" },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });

  return (
    <KitchenBoard
      orders={orders.map((order) => ({
        id: order.id,
        number: order.number,
        tableNumber: order.tableNumber,
        guestName: order.guestName,
        note: order.note,
        status: order.status as OrderStatus,
        createdAt: order.createdAt.toISOString(),
        readyAt: order.readyAt?.toISOString() ?? null,
        items: order.items.map((item) => ({
          id: item.id,
          nameAr: item.nameAr,
          nameFr: item.nameFr,
          size: item.size,
          optionsAr: item.optionsAr,
          optionsFr: item.optionsFr,
          quantity: item.quantity,
          confirmed: item.confirmed,
        })),
      }))}
    />
  );
}
