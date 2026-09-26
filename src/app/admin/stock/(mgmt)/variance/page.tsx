import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { normalizeToDay } from "@/lib/stock";
import { StockVarianceView } from "./stock-variance-view";

export const dynamic = "force-dynamic";

export default async function StockVariancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireAdmin();
  const { date: dateParam } = await searchParams;
  const date = normalizeToDay(dateParam ? new Date(dateParam) : new Date());

  const stockCounts = await prisma.stockCount.findMany({
    // Variance is only computed against the closing count (see finalizeStockCount).
    where: { date, period: "CLOSING" },
    include: {
      workstation: { include: { kitchen: true } },
      worker: true,
      entries: {
        include: {
          workstationIngredient: { include: { ingredient: true } },
        },
      },
    },
  });

  const dailySales = await prisma.dailySales.findUnique({ where: { date } });

  return (
    <StockVarianceView
      date={date.toISOString().slice(0, 10)}
      stockCounts={stockCounts}
      hasDailySales={!!dailySales}
    />
  );
}
