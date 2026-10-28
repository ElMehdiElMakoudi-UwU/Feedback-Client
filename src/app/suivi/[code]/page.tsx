import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@/lib/order-status";
import { DriverTracker } from "./driver-tracker";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sindibad — Suivi de commande",
};

// Public page behind the link staff send on WhatsApp. The code is random, not
// the daily number, so nobody can browse other people's orders.
export default async function DriverTrackingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const order = await prisma.order.findUnique({
    where: { trackingCode: code.toUpperCase() },
    include: { items: true },
  });
  if (!order) redirect("/suivi?notFound=1");

  return (
    <DriverTracker
      orderId={order.id}
      orderNumber={order.number}
      trackingCode={order.trackingCode!}
      guestName={order.guestName}
      total={order.total}
      initialStatus={order.status as OrderStatus}
      items={order.items.map((item) => ({
        id: item.id,
        nameAr: item.nameAr,
        nameFr: item.nameFr,
        size: item.size,
        optionsAr: item.optionsAr,
        optionsFr: item.optionsFr,
        quantity: item.quantity,
      }))}
    />
  );
}
