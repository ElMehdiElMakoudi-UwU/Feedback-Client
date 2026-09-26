"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireStaff, requireWorker } from "@/lib/require-admin";
import { finalizeStockCount, normalizeToDay } from "@/lib/stock";
import { savePhoto } from "@/lib/upload";
import { toBaseUnit } from "@/lib/units";

function revalidateStock() {
  revalidatePath("/admin/stock");
  revalidatePath("/admin/stock/setup");
  revalidatePath("/admin/stock/workers");
  revalidatePath("/admin/stock/recipes");
  revalidatePath("/admin/stock/sales");
  revalidatePath("/admin/stock/variance");
  revalidatePath("/admin/stock/consumption");
  revalidatePath("/admin/stock/count");
}

// Reads a quantity field plus its optional `${key}_unit` picker and converts
// it to the ingredient's base unit. Null when empty or not a number.
function readQuantity(formData: FormData, key: string, baseUnit: string): number | null {
  const raw = formData.get(key);
  if (raw === null || raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  const unitKey = formData.get(`${key}_unit`);
  return toBaseUnit(value, typeof unitKey === "string" ? unitKey : null, baseUnit);
}

// ---- Kitchens & workstations ----

const kitchenSchema = z.object({ name: z.string().trim().min(1).max(100) });

export async function createKitchen(formData: FormData) {
  await requireAdmin();
  const parsed = kitchenSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return;
  const count = await prisma.kitchen.count();
  await prisma.kitchen.create({ data: { name: parsed.data.name, sortOrder: count } });
  revalidateStock();
}

export async function deleteKitchen(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.kitchen.delete({ where: { id } });
  revalidateStock();
}

const workstationSchema = z.object({
  kitchenId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
});

export async function createWorkstation(formData: FormData) {
  await requireAdmin();
  const parsed = workstationSchema.safeParse({
    kitchenId: formData.get("kitchenId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return;
  const count = await prisma.workstation.count({
    where: { kitchenId: parsed.data.kitchenId },
  });
  await prisma.workstation.create({ data: { ...parsed.data, sortOrder: count } });
  revalidateStock();
}

export async function deleteWorkstation(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.workstation.delete({ where: { id } });
  revalidateStock();
}

// ---- Ingredients ----

const ingredientSchema = z.object({
  name: z.string().trim().min(1).max(100),
  unit: z.string().trim().min(1).max(50),
});

export async function createIngredient(formData: FormData) {
  await requireAdmin();
  const parsed = ingredientSchema.safeParse({
    name: formData.get("name"),
    unit: formData.get("unit"),
  });
  if (!parsed.success) return;
  await prisma.ingredient.create({ data: parsed.data });
  revalidateStock();
}

export async function deleteIngredient(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.ingredient.delete({ where: { id } });
  revalidateStock();
}

// ---- Workstation ingredient lists (the manager-defined counter form) ----

const workstationIngredientSchema = z.object({
  workstationId: z.string().min(1),
  ingredientId: z.string().min(1),
});

export async function addWorkstationIngredient(formData: FormData) {
  await requireAdmin();
  const parsed = workstationIngredientSchema.safeParse({
    workstationId: formData.get("workstationId"),
    ingredientId: formData.get("ingredientId"),
  });
  if (!parsed.success) return;
  const count = await prisma.workstationIngredient.count({
    where: { workstationId: parsed.data.workstationId },
  });
  await prisma.workstationIngredient.create({
    data: {
      workstationId: parsed.data.workstationId,
      ingredientId: parsed.data.ingredientId,
      sortOrder: count,
    },
  });
  revalidateStock();
}

export async function removeWorkstationIngredient(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.workstationIngredient.delete({ where: { id } });
  revalidateStock();
}

// ---- Workers ----

const workerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(100),
  workstationId: z.string().min(1),
});

export async function createWorker(
  _prevState: { status: "idle" | "error"; message?: string },
  formData: FormData
) {
  await requireAdmin();

  const parsed = workerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    workstationId: formData.get("workstationId"),
  });
  if (!parsed.success) return { status: "error" as const, message: "invalid" };

  const existing = await prisma.adminUser.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) return { status: "error" as const, message: "exists" };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.adminUser.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      role: "WORKER",
      workstationId: parsed.data.workstationId,
    },
  });

  revalidateStock();
  return { status: "idle" as const };
}

export async function deleteWorker(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.adminUser.delete({ where: { id, role: "WORKER" } });
  revalidateStock();
}

// ---- Recipes (fiche technique) & workstation assignment ----

const menuItemWorkstationSchema = z.object({
  menuItemId: z.string().min(1),
  workstationId: z.string(),
});

export async function setMenuItemWorkstation(formData: FormData) {
  await requireAdmin();
  const parsed = menuItemWorkstationSchema.safeParse({
    menuItemId: formData.get("menuItemId"),
    workstationId: formData.get("workstationId"),
  });
  if (!parsed.success) return;
  await prisma.menuItem.update({
    where: { id: parsed.data.menuItemId },
    data: { workstationId: parsed.data.workstationId || null },
  });
  revalidateStock();
}

const recipeItemSchema = z.object({
  menuItemId: z.string().min(1),
  ingredientId: z.string().min(1),
  size: z.union([z.literal("REGULAR"), z.literal("LARGE"), z.literal("")]),
  quantity: z.coerce.number().positive().max(1_000_000),
});

export async function addRecipeItem(formData: FormData) {
  await requireAdmin();
  const parsed = recipeItemSchema.safeParse({
    menuItemId: formData.get("menuItemId"),
    ingredientId: formData.get("ingredientId"),
    size: formData.get("size") ?? "",
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) return;
  const ingredient = await prisma.ingredient.findUnique({ where: { id: parsed.data.ingredientId } });
  if (!ingredient) return;
  const quantity = readQuantity(formData, "quantity", ingredient.unit);
  if (quantity === null || quantity <= 0) return;
  await prisma.recipeItem.create({
    data: {
      menuItemId: parsed.data.menuItemId,
      ingredientId: parsed.data.ingredientId,
      size: parsed.data.size || null,
      quantity,
    },
  });
  revalidateStock();
}

export async function deleteRecipeItem(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.recipeItem.delete({ where: { id } });
  revalidateStock();
}

// ---- Restocks (mid-shift resupply, logged by a worker or admin) ----

const restockSchema = z.object({
  workstationIngredientId: z.string().min(1),
  quantity: z.coerce.number().positive().max(1_000_000),
  note: z.string().trim().max(200).optional(),
});

export async function logRestock(formData: FormData) {
  const user = await requireStaff();
  if (user.role !== "ADMIN" && user.role !== "WORKER") return;

  const parsed = restockSchema.safeParse({
    workstationIngredientId: formData.get("workstationIngredientId"),
    quantity: formData.get("quantity"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return;

  const wsIngredient = await prisma.workstationIngredient.findUnique({
    where: { id: parsed.data.workstationIngredientId },
    include: { ingredient: true },
  });
  if (!wsIngredient) return;
  if (user.role === "WORKER" && user.workstationId !== wsIngredient.workstationId) return;
  const quantity = readQuantity(formData, "quantity", wsIngredient.ingredient.unit);
  if (quantity === null || quantity <= 0) return;

  const photoUrl = await savePhoto(formData.get("photo"), "restocks");

  await prisma.$transaction([
    prisma.stockRestock.create({
      data: {
        workstationIngredientId: parsed.data.workstationIngredientId,
        quantity,
        note: parsed.data.note,
        photoUrl,
        createdById: user.id,
      },
    }),
    prisma.workstationIngredient.update({
      where: { id: parsed.data.workstationIngredientId },
      data: { currentQuantity: { increment: quantity } },
    }),
  ]);

  revalidateStock();
}

// Batch version of logRestock: workers typically jot restock quantities on
// paper during a fast-paced shift and enter them all at once, in one go,
// before submitting the closing count — rather than logging each one live.
export async function logRestocksBatch(formData: FormData) {
  const user = await requireStaff();
  if (user.role !== "ADMIN" && user.role !== "WORKER") return;

  const workstationId = String(formData.get("workstationId") || "");
  if (!workstationId) return;
  if (user.role === "WORKER" && user.workstationId !== workstationId) return;

  const wsIngredients = await prisma.workstationIngredient.findMany({
    where: { workstationId },
    include: { ingredient: true },
  });

  const entries: { workstationIngredientId: string; quantity: number; note?: string; photoUrl: string | null }[] =
    [];
  for (const wi of wsIngredients) {
    const quantity = readQuantity(formData, `restock_${wi.id}`, wi.ingredient.unit);
    if (quantity === null || quantity <= 0) continue;
    const noteRaw = formData.get(`restocknote_${wi.id}`);
    const note = typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim().slice(0, 200) : undefined;
    const photoUrl = await savePhoto(formData.get(`restockphoto_${wi.id}`), "restocks");
    entries.push({ workstationIngredientId: wi.id, quantity, note, photoUrl });
  }
  if (entries.length === 0) return;

  await prisma.$transaction(
    entries.flatMap((entry) => [
      prisma.stockRestock.create({
        data: {
          workstationIngredientId: entry.workstationIngredientId,
          quantity: entry.quantity,
          note: entry.note,
          photoUrl: entry.photoUrl,
          createdById: user.id,
        },
      }),
      prisma.workstationIngredient.update({
        where: { id: entry.workstationIngredientId },
        data: { currentQuantity: { increment: entry.quantity } },
      }),
    ])
  );

  revalidateStock();
}

// ---- Start/end-of-shift stock counts (worker) ----

async function readCountEntries(
  formData: FormData,
  wsIngredients: { id: string; ingredient: { unit: string } }[],
  photoSubdir: string
) {
  const entries: { workstationIngredientId: string; actualQuantity: number; photoUrl: string | null }[] = [];
  for (const wsIngredient of wsIngredients) {
    const quantity = readQuantity(formData, `qty_${wsIngredient.id}`, wsIngredient.ingredient.unit);
    if (quantity === null || quantity < 0) continue;
    const photoUrl = await savePhoto(formData.get(`photo_${wsIngredient.id}`), photoSubdir);
    entries.push({ workstationIngredientId: wsIngredient.id, actualQuantity: quantity, photoUrl });
  }
  return entries;
}

// Beginning-of-shift count: the worker confirms (or corrects) what's
// physically on the counter. This becomes the day's authoritative starting
// baseline, overriding whatever was carried forward from last night.
export async function submitOpeningCount(formData: FormData) {
  const worker = await requireWorker();
  if (!worker.workstationId) return;

  const today = normalizeToDay(new Date());
  const existing = await prisma.stockCount.findUnique({
    where: {
      workstationId_date_period: {
        workstationId: worker.workstationId,
        date: today,
        period: "OPENING",
      },
    },
  });
  if (existing) return;

  const wsIngredients = await prisma.workstationIngredient.findMany({
    where: { workstationId: worker.workstationId },
    include: { ingredient: true },
  });

  const entries = await readCountEntries(formData, wsIngredients, "opening-counts");
  if (entries.length === 0) return;

  await prisma.$transaction([
    prisma.stockCount.create({
      data: {
        workstationId: worker.workstationId,
        date: today,
        period: "OPENING",
        workerId: worker.id,
        finalizedAt: new Date(),
        entries: { create: entries },
      },
    }),
    ...entries.map((entry) =>
      prisma.workstationIngredient.update({
        where: { id: entry.workstationIngredientId },
        data: { currentQuantity: entry.actualQuantity },
      })
    ),
  ]);

  revalidateStock();
}

// End-of-shift count: compared against expected consumption to compute the
// day's variance. Requires the opening count to already be in, so the
// baseline it's measured against is the shift's actual starting point.
export async function submitClosingCount(formData: FormData) {
  const worker = await requireWorker();
  if (!worker.workstationId) return;

  const today = normalizeToDay(new Date());

  const openingCount = await prisma.stockCount.findUnique({
    where: {
      workstationId_date_period: {
        workstationId: worker.workstationId,
        date: today,
        period: "OPENING",
      },
    },
  });
  if (!openingCount) return;

  const existing = await prisma.stockCount.findUnique({
    where: {
      workstationId_date_period: {
        workstationId: worker.workstationId,
        date: today,
        period: "CLOSING",
      },
    },
  });
  if (existing) return;

  const wsIngredients = await prisma.workstationIngredient.findMany({
    where: { workstationId: worker.workstationId },
    include: { ingredient: true },
  });

  const entries = await readCountEntries(formData, wsIngredients, "closing-counts");
  if (entries.length === 0) return;

  await prisma.stockCount.create({
    data: {
      workstationId: worker.workstationId,
      date: today,
      period: "CLOSING",
      workerId: worker.id,
      entries: { create: entries },
    },
  });

  await finalizeStockCount(worker.workstationId, today);
  revalidateStock();
}

// ---- Daily sales entry (manager) ----

export async function saveDailySales(formData: FormData) {
  const admin = await requireAdmin();

  const dateRaw = String(formData.get("date") || "");
  const date = dateRaw ? normalizeToDay(new Date(dateRaw)) : normalizeToDay(new Date());

  const menuItems = await prisma.menuItem.findMany({
    select: { id: true, priceLarge: true },
  });

  const items: { menuItemId: string; size: string | null; quantitySold: number }[] = [];
  for (const menuItem of menuItems) {
    const sizes = menuItem.priceLarge != null ? ["REGULAR", "LARGE"] : [null];
    for (const size of sizes) {
      const key = size ? `sold_${menuItem.id}_${size}` : `sold_${menuItem.id}`;
      const raw = formData.get(key);
      if (raw === null || raw === "") continue;
      const quantitySold = Number(raw);
      if (!Number.isFinite(quantitySold) || quantitySold < 0) continue;
      items.push({ menuItemId: menuItem.id, size, quantitySold: Math.trunc(quantitySold) });
    }
  }

  await prisma.dailySales.upsert({
    where: { date },
    create: {
      date,
      createdById: admin.id,
      items: { create: items },
    },
    update: {
      createdById: admin.id,
      items: { deleteMany: {}, create: items },
    },
  });

  const affectedMenuItemIds = [...new Set(items.map((i) => i.menuItemId))];
  const workstationIds = await prisma.menuItem.findMany({
    where: { id: { in: affectedMenuItemIds }, workstationId: { not: null } },
    select: { workstationId: true },
    distinct: ["workstationId"],
  });

  for (const { workstationId } of workstationIds) {
    if (workstationId) await finalizeStockCount(workstationId, date);
  }

  revalidateStock();
  redirect(`/admin/stock/variance?date=${date.toISOString().slice(0, 10)}`);
}
