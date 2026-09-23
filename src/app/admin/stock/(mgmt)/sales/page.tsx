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

  // `date` is the local calendar day encoded as UTC midnight (see
  // normalizeToDay), so rebuild the local-time bounds of that day.
  const dayStart = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const dayEnd = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);

  const [categories, dailySales, orderItems] = await Promise.all([
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
    // Items the app took orders for that day. Cancelled orders and additions
    // still awaiting cashier confirmation were never served, so skip them.
    prisma.orderItem.findMany({
      where: {
        confirmed: true,
        menuItemId: { not: null },
        order: {
          status: { not: "CANCELLED" },
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      },
      select: {
        menuItemId: true,
        size: true,
        quantity: true,
        menuItem: { select: { priceLarge: true } },
      },
    }),
  ]);

  // Bucket by the same (menuItemId, size) keys the POS form uses: items with a
  // large variant are split REGULAR/LARGE, everything else has a null size.
  const appTotals = new Map<string, { menuItemId: string; size: string | null; quantity: number }>();
  for (const item of orderItems) {
    if (!item.menuItemId || !item.menuItem) continue;
    const size = item.menuItem.priceLarge != null ? (item.size === "LARGE" ? "LARGE" : "REGULAR") : null;
    const key = `${item.menuItemId}_${size}`;
    const entry = appTotals.get(key) ?? { menuItemId: item.menuItemId, size, quantity: 0 };
    entry.quantity += item.quantity;
    appTotals.set(key, entry);
  }

  return (
    <StockSalesView
      categories={categories}
      date={date.toISOString().slice(0, 10)}
      existingItems={dailySales?.items ?? []}
      appItems={[...appTotals.values()]}
    />
  );
}
