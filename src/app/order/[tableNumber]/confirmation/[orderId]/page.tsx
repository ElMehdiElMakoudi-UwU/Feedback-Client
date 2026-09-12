import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@/lib/order-status";
import { OrderStatusTracker } from "./order-status-tracker";

export const dynamic = "force-dynamic";

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ tableNumber: string; orderId: string }>;
}) {
  const { tableNumber, orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || order.tableNumber !== tableNumber) notFound();

  return (
    <OrderStatusTracker
      tableNumber={order.tableNumber}
      orderId={order.id}
      guestName={order.guestName}
      total={order.total}
      initialStatus={order.status as OrderStatus}
      items={order.items.map((item) => ({
        id: item.id,
        nameAr: item.nameAr,
        nameFr: item.nameFr,
        size: item.size,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      }))}
    />
  );
}
