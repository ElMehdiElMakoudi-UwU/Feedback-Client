import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { AnalyticsView } from "./analytics-view";

export const dynamic = "force-dynamic";

const RANGE_DAYS = { "7d": 7, "30d": 30, "90d": 90 } as const;
type Range = keyof typeof RANGE_DAYS;

function isRange(value: string | undefined): value is Range {
  return value === "7d" || value === "30d" || value === "90d";
}

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdmin();
  const { range: rawRange } = await searchParams;
  const range: Range = isRange(rawRange) ? rawRange : "7d";
  const days = RANGE_DAYS[range];

  const rangeStart = new Date();
  rangeStart.setHours(0, 0, 0, 0);
  rangeStart.setDate(rangeStart.getDate() - (days - 1));

  const dayKeys: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    dayKeys.push(dayKey(d));
  }

  const [completedOrders, cancelledCount, feedback, orderItems, pointsEarnedAgg, pointsRedeemedAgg, activeCustomerIds] =
    await Promise.all([
      prisma.order.findMany({
        where: { status: "COMPLETED", createdAt: { gte: rangeStart } },
        select: { id: true, total: true, createdAt: true },
      }),
      prisma.order.count({
        where: { status: "CANCELLED", createdAt: { gte: rangeStart } },
      }),
      prisma.feedback.findMany({
        where: { createdAt: { gte: rangeStart } },
        select: { foodRating: true, serviceRating: true, createdAt: true },
      }),
      prisma.orderItem.findMany({
        where: {
          order: { status: "COMPLETED", createdAt: { gte: rangeStart } },
        },
        select: { nameAr: true, nameFr: true, unitPrice: true, quantity: true },
      }),
      prisma.pointsTransaction.aggregate({
        where: { points: { gt: 0 }, createdAt: { gte: rangeStart } },
        _sum: { points: true },
      }),
      prisma.pointsTransaction.aggregate({
        where: { points: { lt: 0 }, createdAt: { gte: rangeStart } },
        _sum: { points: true },
      }),
      prisma.pointsTransaction.findMany({
        where: { createdAt: { gte: rangeStart } },
        select: { customerId: true },
        distinct: ["customerId"],
      }),
    ]);

  const revenueByDay = new Map(dayKeys.map((k) => [k, 0]));
  const ordersByDay = new Map(dayKeys.map((k) => [k, 0]));
  let revenueTotal = 0;
  for (const order of completedOrders) {
    const key = dayKey(order.createdAt);
    revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + order.total);
    ordersByDay.set(key, (ordersByDay.get(key) ?? 0) + 1);
    revenueTotal += order.total;
  }

  const foodByDay = new Map<string, number[]>(dayKeys.map((k) => [k, []]));
  const serviceByDay = new Map<string, number[]>(dayKeys.map((k) => [k, []]));
  for (const f of feedback) {
    const key = dayKey(f.createdAt);
    foodByDay.get(key)?.push(f.foodRating);
    serviceByDay.get(key)?.push(f.serviceRating);
  }

  const itemStats = new Map<
    string,
    { nameAr: string; nameFr: string; quantity: number; revenue: number }
  >();
  for (const item of orderItems) {
    const key = item.nameFr;
    const existing = itemStats.get(key) ?? {
      nameAr: item.nameAr,
      nameFr: item.nameFr,
      quantity: 0,
      revenue: 0,
    };
    existing.quantity += item.quantity;
    existing.revenue += item.unitPrice * item.quantity;
    itemStats.set(key, existing);
  }
  const topItems = [...itemStats.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  const completedCount = completedOrders.length;
  const cancellationRate =
    completedCount + cancelledCount > 0
      ? cancelledCount / (completedCount + cancelledCount)
      : null;

  const pointsEarned = pointsEarnedAgg._sum.points ?? 0;
  const pointsRedeemed = Math.abs(pointsRedeemedAgg._sum.points ?? 0);

  return (
    <AnalyticsView
      range={range}
      kpis={{
        revenueTotal,
        completedCount,
        avgOrderValue: completedCount > 0 ? revenueTotal / completedCount : 0,
        cancellationRate,
        foodAvg: average(feedback.map((f) => f.foodRating)),
        serviceAvg: average(feedback.map((f) => f.serviceRating)),
        feedbackCount: feedback.length,
        pointsEarned,
        pointsRedeemed,
        activeLoyaltyCustomers: activeCustomerIds.filter(
          (c) => c.customerId !== null
        ).length,
      }}
      revenueSeries={dayKeys.map((k) => ({
        day: k,
        revenue: revenueByDay.get(k) ?? 0,
        orders: ordersByDay.get(k) ?? 0,
      }))}
      ratingSeries={dayKeys.map((k) => ({
        day: k,
        food: average(foodByDay.get(k) ?? []),
        service: average(serviceByDay.get(k) ?? []),
      }))}
      topItems={topItems}
    />
  );
}
