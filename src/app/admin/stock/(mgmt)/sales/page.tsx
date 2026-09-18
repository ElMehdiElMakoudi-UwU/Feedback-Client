import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { normalizeToDay } from "@/lib/stock";
import { StockSalesView } from "./stock-sales-view";

export const dynamic = "force-dynamic";

export default async function StockSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireAdmin();
  const { date: dateParam } = await searchParams;

  const date = normalizeToDay(dateParam ? new Date(dateParam) : new Date());

  const [categories, dailySales] = await Promise.all([
    prisma.menuCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        section: true,
        items: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.dailySales.findUnique({
      where: { date },
      include: { items: true },
    }),
  ]);

  return (
    <StockSalesView
      categories={categories}
      date={date.toISOString().slice(0, 10)}
      existingItems={dailySales?.items ?? []}
    />
  );
}
