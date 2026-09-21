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

export type WorkstationConsumption = {
  workstationId: string;
  workstationName: string;
  kitchenName: string;
  expectedConsumed: number;
  actualConsumed: number | null;
  variance: number | null;
};

export type IngredientConsumption = {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  totalExpected: number;
  totalActual: number | null;
  totalVariance: number | null;
  byWorkstation: WorkstationConsumption[];
};

/**
 * Rolls up, for a given day, how much of each ingredient was expected to be
 * consumed (from recipes x sales) and how much actually was (from finalized
 * closing counts' variance), across every post — so an ingredient bought
 * once (e.g. chicken) but used by several posts (Tacos, Pizza, Pasticcio...)
 * shows as one line, with a per-post breakdown available underneath.
 */
export async function getConsumptionByIngredient(date: Date): Promise<IngredientConsumption[]> {
  const day = normalizeToDay(date);

  const dailySales = await prisma.dailySales.findUnique({
    where: { date: day },
    include: { items: true },
  });

  const menuItems = await prisma.menuItem.findMany({
    where: { workstationId: { not: null } },
    include: { recipeItems: true, workstation: { include: { kitchen: true } } },
  });

  // key `${workstationId}:${ingredientId}` -> expected units consumed that day
  const expectedMap = new Map<string, number>();
  const workstationMeta = new Map<string, { name: string; kitchenName: string }>();

  if (dailySales) {
    for (const item of dailySales.items) {
      const menuItem = menuItems.find((m) => m.id === item.menuItemId);
      if (!menuItem || !menuItem.workstationId || !menuItem.workstation) continue;
      workstationMeta.set(menuItem.workstationId, {
        name: menuItem.workstation.name,
        kitchenName: menuItem.workstation.kitchen.name,
      });
      for (const recipeItem of menuItem.recipeItems) {
        if (recipeItem.size && recipeItem.size !== item.size) continue;
        if (!recipeItem.size && item.size) continue;
        const key = `${menuItem.workstationId}:${recipeItem.ingredientId}`;
        expectedMap.set(key, (expectedMap.get(key) ?? 0) + recipeItem.quantity * item.quantitySold);
      }
    }
  }

  const stockCounts = await prisma.stockCount.findMany({
    where: { date: day, period: "CLOSING" },
    include: {
      workstation: { include: { kitchen: true } },
      entries: { include: { workstationIngredient: { include: { ingredient: true } } } },
    },
  });

  type Row = {
    ingredientId: string;
    ingredientName: string;
    unit: string;
    workstationId: string;
    workstationName: string;
    kitchenName: string;
    expectedConsumed: number;
    actualConsumed: number | null;
    variance: number | null;
  };
  const rows = new Map<string, Row>();

  for (const [key, expectedConsumed] of expectedMap) {
    const [workstationId, ingredientId] = key.split(":");
    const meta = workstationMeta.get(workstationId);
    rows.set(key, {
      ingredientId,
      ingredientName: "",
      unit: "",
      workstationId,
      workstationName: meta?.name ?? "",
      kitchenName: meta?.kitchenName ?? "",
      expectedConsumed,
      actualConsumed: null,
      variance: null,
    });
  }

  for (const count of stockCounts) {
    for (const entry of count.entries) {
      if (entry.variance == null) continue;
      const ingredientId = entry.workstationIngredient.ingredientId;
      const key = `${count.workstationId}:${ingredientId}`;
      const expectedConsumed = expectedMap.get(key) ?? 0;
      rows.set(key, {
        ingredientId,
        ingredientName: entry.workstationIngredient.ingredient.name,
        unit: entry.workstationIngredient.ingredient.unit,
        workstationId: count.workstationId,
        workstationName: count.workstation.name,
        kitchenName: count.workstation.kitchen.name,
        expectedConsumed,
        actualConsumed: expectedConsumed - entry.variance,
        variance: entry.variance,
      });
    }
  }

  const missingNameIds = [
    ...new Set([...rows.values()].filter((r) => !r.ingredientName).map((r) => r.ingredientId)),
  ];
  if (missingNameIds.length > 0) {
    const ingredients = await prisma.ingredient.findMany({ where: { id: { in: missingNameIds } } });
    for (const row of rows.values()) {
      if (!row.ingredientName) {
        const ingredient = ingredients.find((i) => i.id === row.ingredientId);
        if (ingredient) {
          row.ingredientName = ingredient.name;
          row.unit = ingredient.unit;
        }
      }
    }
  }

  const byIngredient = new Map<string, IngredientConsumption>();
  for (const row of rows.values()) {
    let agg = byIngredient.get(row.ingredientId);
    if (!agg) {
      agg = {
        ingredientId: row.ingredientId,
        ingredientName: row.ingredientName,
        unit: row.unit,
        totalExpected: 0,
        totalActual: null,
        totalVariance: null,
        byWorkstation: [],
      };
      byIngredient.set(row.ingredientId, agg);
    }
    agg.totalExpected += row.expectedConsumed;
    if (row.actualConsumed != null) {
      agg.totalActual = (agg.totalActual ?? 0) + row.actualConsumed;
      agg.totalVariance = (agg.totalVariance ?? 0) + (row.variance ?? 0);
    }
    agg.byWorkstation.push({
      workstationId: row.workstationId,
      workstationName: row.workstationName,
      kitchenName: row.kitchenName,
      expectedConsumed: row.expectedConsumed,
      actualConsumed: row.actualConsumed,
      variance: row.variance,
    });
  }

  return [...byIngredient.values()].sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));
}
