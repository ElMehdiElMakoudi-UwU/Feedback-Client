import { requireStaff } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@/lib/order-status";
import { OrdersBoard } from "./orders-board";

export const dynamic = "force-dynamic";

const RECENT_COMPLETED_LIMIT = 10;

export default async function AdminOrdersPage() {
  await requireStaff();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [activeOrders, recentCompletedOrders, completedTodayAgg, cancelledTodayCount] =
    await Promise.all([
      prisma.order.findMany({
        where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
        orderBy: [{ tableNumber: "asc" }, { createdAt: "asc" }],
        include: { items: true, customer: { select: { phone: true } } },
      }),
      prisma.order.findMany({
        where: { status: "COMPLETED", createdAt: { gte: todayStart } },
        orderBy: { updatedAt: "desc" },
        take: RECENT_COMPLETED_LIMIT,
        include: { items: true, customer: { select: { phone: true } } },
      }),
      prisma.order.aggregate({
        where: { status: "COMPLETED", createdAt: { gte: todayStart } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.order.count({
        where: { status: "CANCELLED", createdAt: { gte: todayStart } },
      }),
    ]);

  const orders = [...activeOrders, ...recentCompletedOrders];

  return (
    <OrdersBoard
      stats={{
        revenueToday: completedTodayAgg._sum.total ?? 0,
        completedToday: completedTodayAgg._count,
        cancelledToday: cancelledTodayCount,
      }}
      initialOrders={orders.map((order) => ({
        id: order.id,
        tableNumber: order.tableNumber,
        guestName: order.guestName,
        deliveryAddress: order.deliveryAddress,
        customerPhone: order.customer?.phone ?? null,
        note: order.note,
        total: order.total,
        hasLoyaltyPhone: order.customerId !== null,
        status: order.status as OrderStatus,
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((item) => ({
          id: item.id,
          nameAr: item.nameAr,
          nameFr: item.nameFr,
          size: item.size,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
        })),
      }))}
    />
  );
}
