import { requireStaff } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@/lib/order-status";
import type { PaymentMethod, TableRequestType } from "@/lib/table-requests";
import { OrdersBoard } from "./orders-board";

export const dynamic = "force-dynamic";

const RECENT_COMPLETED_LIMIT = 10;

export default async function AdminOrdersPage() {
  await requireStaff();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    activeOrders,
    recentCompletedOrders,
    completedTodayAgg,
    cancelledTodayCount,
    pendingTableRequests,
  ] = await Promise.all([
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
      prisma.tableRequest.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        include: {
          feedback: {
            select: { foodRating: true, serviceRating: true, comment: true },
          },
        },
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
      tableRequests={pendingTableRequests.map((request) => ({
        id: request.id,
        tableNumber: request.tableNumber,
        type: request.type as TableRequestType,
        paymentMethod: request.paymentMethod as PaymentMethod | null,
        createdAt: request.createdAt.toISOString(),
        feedback: request.feedback,
      }))
        // Unhappy guests first; the sort is stable so each group stays oldest-first.
        .sort(
          (a, b) =>
            Number(b.type === "MANAGER") - Number(a.type === "MANAGER")
        )}
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
        optionsAr: item.optionsAr,
        optionsFr: item.optionsFr,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          confirmed: item.confirmed,
        })),
      }))}
    />
  );
}
