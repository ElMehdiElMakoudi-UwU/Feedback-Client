import { prisma } from "@/lib/prisma";

// A variance smaller than this fraction of the expected quantity is treated
// as normal rounding/handling noise and isn't highlighted to the owner.
export const VARIANCE_ALERT_THRESHOLD = 0.05;

export function isVarianceAlert(variance: number, expectedQuantity: number) {
  const tolerance = Math.max(Math.abs(expectedQuantity) * VARIANCE_ALERT_THRESHOLD, 0.01);
  return Math.abs(variance) > tolerance;
}

export function normalizeToDay(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

/**
 * Attempts to finalize a workstation's stock count for a given day: matches
 * the worker's physical count against expected consumption derived from that
 * day's recipe-based sales, snapshots the variance, and rolls the running
 * ingredient baseline forward. Either the StockCount or the DailySales for
 * that day can be saved first, so this is called (and is a no-op if the
 * other half isn't in yet) from both save paths.
 */
export async function finalizeStockCount(workstationId: string, date: Date) {
  const day = normalizeToDay(date);

  const stockCount = await prisma.stockCount.findUnique({
    where: { workstationId_date_period: { workstationId, date: day, period: "CLOSING" } },
    include: { entries: true },
  });
  if (!stockCount || stockCount.finalizedAt) return;

  const dailySales = await prisma.dailySales.findUnique({
    where: { date: day },
    include: { items: true },
  });
  if (!dailySales) return;

  const menuItems = await prisma.menuItem.findMany({
    where: { workstationId },
    include: { recipeItems: true },
  });
  if (menuItems.length === 0) return;

  // ingredientId -> expected units consumed at this workstation today
  const consumption = new Map<string, number>();
  for (const item of dailySales.items) {
    const menuItem = menuItems.find((m) => m.id === item.menuItemId);
    if (!menuItem) continue;
    for (const recipeItem of menuItem.recipeItems) {
      if (recipeItem.size && recipeItem.size !== item.size) continue;
      if (!recipeItem.size && item.size) continue;
      const prior = consumption.get(recipeItem.ingredientId) ?? 0;
      consumption.set(
        recipeItem.ingredientId,
        prior + recipeItem.quantity * item.quantitySold
      );
    }
  }

  // currentQuantity already reflects today's restocks (logRestock applies
  // them immediately, so the worker sees a live running total), so the
  // expected baseline here is just that minus today's expected consumption.
  const workstationIngredients = await prisma.workstationIngredient.findMany({
    where: { workstationId },
  });

  await prisma.$transaction(async (tx) => {
    for (const entry of stockCount.entries) {
      const wsIngredient = workstationIngredients.find(
        (wi) => wi.id === entry.workstationIngredientId
      );
      if (!wsIngredient) continue;

      const expectedConsumption = consumption.get(wsIngredient.ingredientId) ?? 0;
      const expectedQuantity = wsIngredient.currentQuantity - expectedConsumption;
      const variance = entry.actualQuantity - expectedQuantity;

      await tx.stockCountEntry.update({
        where: { id: entry.id },
        data: { expectedQuantity, variance },
      });

      await tx.workstationIngredient.update({
        where: { id: wsIngredient.id },
        data: { currentQuantity: entry.actualQuantity },
      });
    }

    await tx.stockCount.update({
      where: { id: stockCount.id },
      data: { finalizedAt: new Date() },
    });
  });
}
