import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { finalizeStockCount, normalizeToDay } from "../src/lib/stock";

const WORKER_PASSWORD = "Worker123!";

type IngredientInput = { name: string; unit: string };

const ingredients: IngredientInput[] = [
  { name: "Poulet", unit: "Kg" },
  { name: "Viande hachée", unit: "Kg" },
  { name: "Bœuf", unit: "Kg" },
  { name: "Tortillas", unit: "Unit" },
  { name: "Pâte à pizza", unit: "Unit" },
  { name: "Mozzarella", unit: "Kg" },
  { name: "Sauce tomate", unit: "L" },
  { name: "Pâte à pasticchio", unit: "Unit" },
  { name: "Salade", unit: "Kg" },
  { name: "Crème", unit: "Kg" },
  { name: "Chocolat", unit: "Kg" },
];

type WorkstationSeed = {
  kitchenName: string;
  name: string;
  workerEmail: string;
  openingStock: { ingredient: string; quantity: number }[];
  recipes: {
    menuItemNameFr: string;
    lines: { ingredient: string; size: "REGULAR" | "LARGE" | null; quantity: number }[];
  }[];
};

const workstations: WorkstationSeed[] = [
  {
    kitchenName: "Cuisine 1",
    name: "Tacos",
    workerEmail: "tacos@sindibad.local",
    openingStock: [
      { ingredient: "Poulet", quantity: 40 },
      { ingredient: "Viande hachée", quantity: 15 },
      { ingredient: "Tortillas", quantity: 180 },
    ],
    recipes: [
      {
        menuItemNameFr: "Poulet",
        lines: [
          { ingredient: "Poulet", size: null, quantity: 0.15 },
          { ingredient: "Tortillas", size: null, quantity: 2 },
        ],
      },
      {
        menuItemNameFr: "Viande Hachée",
        lines: [
          { ingredient: "Viande hachée", size: null, quantity: 0.15 },
          { ingredient: "Tortillas", size: null, quantity: 2 },
        ],
      },
    ],
  },
  {
    kitchenName: "Cuisine 1",
    name: "Pizza",
    workerEmail: "pizza@sindibad.local",
    openingStock: [
      { ingredient: "Pâte à pizza", quantity: 60 },
      { ingredient: "Mozzarella", quantity: 25 },
      { ingredient: "Sauce tomate", quantity: 20 },
      { ingredient: "Poulet", quantity: 10 },
    ],
    recipes: [
      {
        menuItemNameFr: "Pizza Margarita",
        lines: [
          { ingredient: "Pâte à pizza", size: "REGULAR", quantity: 1 },
          { ingredient: "Pâte à pizza", size: "LARGE", quantity: 1 },
          { ingredient: "Mozzarella", size: "REGULAR", quantity: 0.2 },
          { ingredient: "Mozzarella", size: "LARGE", quantity: 0.35 },
          { ingredient: "Sauce tomate", size: "REGULAR", quantity: 0.15 },
          { ingredient: "Sauce tomate", size: "LARGE", quantity: 0.25 },
        ],
      },
      {
        menuItemNameFr: "Pizza Poulet Et Champignons",
        lines: [
          { ingredient: "Pâte à pizza", size: "REGULAR", quantity: 1 },
          { ingredient: "Pâte à pizza", size: "LARGE", quantity: 1 },
          { ingredient: "Mozzarella", size: "REGULAR", quantity: 0.2 },
          { ingredient: "Mozzarella", size: "LARGE", quantity: 0.35 },
          { ingredient: "Poulet", size: "REGULAR", quantity: 0.1 },
          { ingredient: "Poulet", size: "LARGE", quantity: 0.18 },
        ],
      },
    ],
  },
  {
    kitchenName: "Cuisine 1",
    name: "Pasticchio",
    workerEmail: "pasticchio@sindibad.local",
    openingStock: [
      { ingredient: "Pâte à pasticchio", quantity: 40 },
      { ingredient: "Poulet", quantity: 15 },
      { ingredient: "Viande hachée", quantity: 10 },
    ],
    recipes: [
      {
        menuItemNameFr: "Pasticcio Poulet",
        lines: [
          { ingredient: "Pâte à pasticchio", size: null, quantity: 1 },
          { ingredient: "Poulet", size: null, quantity: 0.15 },
        ],
      },
      {
        menuItemNameFr: "Pasticcio Viande Hachée",
        lines: [
          { ingredient: "Pâte à pasticchio", size: null, quantity: 1 },
          { ingredient: "Viande hachée", size: null, quantity: 0.15 },
        ],
      },
    ],
  },
  {
    kitchenName: "Cuisine 2",
    name: "Grill & Plats",
    workerEmail: "grill@sindibad.local",
    openingStock: [
      { ingredient: "Poulet", quantity: 30 },
      { ingredient: "Bœuf", quantity: 15 },
    ],
    recipes: [
      {
        menuItemNameFr: "Suprême Poulet",
        lines: [{ ingredient: "Poulet", size: null, quantity: 0.25 }],
      },
      {
        menuItemNameFr: "Entrecôte De Bœuf",
        lines: [{ ingredient: "Bœuf", size: null, quantity: 0.3 }],
      },
    ],
  },
  {
    kitchenName: "Cuisine 2",
    name: "Salades & Entrées",
    workerEmail: "salades@sindibad.local",
    openingStock: [{ ingredient: "Salade", quantity: 12 }],
    recipes: [
      {
        menuItemNameFr: "Salade Niçoise",
        lines: [{ ingredient: "Salade", size: null, quantity: 0.2 }],
      },
      {
        menuItemNameFr: "Salade Healthy",
        lines: [{ ingredient: "Salade", size: null, quantity: 0.2 }],
      },
    ],
  },
  {
    kitchenName: "Cuisine 2",
    name: "Desserts",
    workerEmail: "desserts@sindibad.local",
    openingStock: [
      { ingredient: "Crème", quantity: 10 },
      { ingredient: "Chocolat", quantity: 6 },
    ],
    recipes: [
      {
        menuItemNameFr: "Tiramisu",
        lines: [{ ingredient: "Crème", size: null, quantity: 0.1 }],
      },
      {
        menuItemNameFr: "Chocolat Fondu",
        lines: [{ ingredient: "Chocolat", size: null, quantity: 0.15 }],
      },
    ],
  },
];

// menuItemNameFr -> { size -> quantitySold } sold "yesterday", used to seed a
// finished day so the variance dashboard has data to show immediately.
const yesterdaySales: Record<string, Record<string, number>> = {
  Poulet: { none: 20 },
  "Viande Hachée": { none: 10 },
  "Pizza Margarita": { REGULAR: 8, LARGE: 4 },
  "Pizza Poulet Et Champignons": { REGULAR: 5, LARGE: 2 },
  "Pasticcio Poulet": { none: 12 },
  "Pasticcio Viande Hachée": { none: 6 },
  "Suprême Poulet": { none: 9 },
  "Entrecôte De Bœuf": { none: 5 },
  "Salade Niçoise": { none: 7 },
  "Salade Healthy": { none: 4 },
  Tiramisu: { none: 10 },
  "Chocolat Fondu": { none: 6 },
};

// Yesterday's end-of-day physical count per workstation (ingredient name ->
// actual quantity found). "Tortillas" is deliberately short to demonstrate a
// flagged shrinkage on the variance dashboard.
const yesterdayCounts: Record<string, Record<string, number>> = {
  Tacos: { Poulet: 40, "Viande hachée": 13, Tortillas: 100 },
  Pizza: { "Pâte à pizza": 40, Mozzarella: 19.5, "Sauce tomate": 16.2, Poulet: 8.7 },
  Pasticchio: { "Pâte à pasticchio": 22, Poulet: 11.2, "Viande hachée": 9.2 },
  "Grill & Plats": { Poulet: 27.7, "Bœuf": 13.4 },
  "Salades & Entrées": { Salade: 9.6 },
  Desserts: { Crème: 8.9, Chocolat: 5.1 },
};

// A mid-shift restock logged yesterday at the Tacos station, to exercise
// that path too.
const yesterdayRestocks: { workstation: string; ingredient: string; quantity: number }[] = [
  { workstation: "Tacos", ingredient: "Poulet", quantity: 5 },
];

async function main() {
  console.log("Clearing existing stock-management data...");
  await prisma.stockCountEntry.deleteMany();
  await prisma.stockCount.deleteMany();
  await prisma.dailySalesItem.deleteMany();
  await prisma.dailySales.deleteMany();
  await prisma.stockRestock.deleteMany();
  await prisma.recipeItem.deleteMany();
  await prisma.workstationIngredient.deleteMany();
  await prisma.adminUser.deleteMany({ where: { role: "WORKER" } });
  await prisma.menuItem.updateMany({ data: { workstationId: null } });
  await prisma.workstation.deleteMany();
  await prisma.kitchen.deleteMany();
  await prisma.ingredient.deleteMany();

  console.log("Creating kitchens...");
  const kitchenNames = [...new Set(workstations.map((w) => w.kitchenName))];
  const kitchensByName = new Map<string, { id: string }>();
  for (let i = 0; i < kitchenNames.length; i++) {
    const kitchen = await prisma.kitchen.create({
      data: { name: kitchenNames[i], sortOrder: i },
    });
    kitchensByName.set(kitchenNames[i], kitchen);
  }

  console.log("Creating ingredients...");
  const ingredientsByName = new Map<string, { id: string }>();
  for (const ing of ingredients) {
    const created = await prisma.ingredient.create({ data: ing });
    ingredientsByName.set(ing.name, created);
  }

  const yesterday = normalizeToDay(new Date(Date.now() - 24 * 3600 * 1000));

  for (let i = 0; i < workstations.length; i++) {
    const ws = workstations[i];
    console.log(`Setting up workstation: ${ws.kitchenName} — ${ws.name}`);

    const kitchen = kitchensByName.get(ws.kitchenName)!;
    const workstation = await prisma.workstation.create({
      data: { kitchenId: kitchen.id, name: ws.name, sortOrder: i },
    });

    const wsIngredientByIngredientName = new Map<string, { id: string }>();
    for (let j = 0; j < ws.openingStock.length; j++) {
      const stock = ws.openingStock[j];
      const ingredient = ingredientsByName.get(stock.ingredient)!;
      const wsIngredient = await prisma.workstationIngredient.create({
        data: {
          workstationId: workstation.id,
          ingredientId: ingredient.id,
          currentQuantity: stock.quantity,
          sortOrder: j,
        },
      });
      wsIngredientByIngredientName.set(stock.ingredient, wsIngredient);
    }

    const passwordHash = await bcrypt.hash(WORKER_PASSWORD, 10);
    const worker = await prisma.adminUser.create({
      data: {
        email: ws.workerEmail,
        passwordHash,
        role: "WORKER",
        workstationId: workstation.id,
      },
    });

    for (const recipe of ws.recipes) {
      const menuItem = await prisma.menuItem.findFirst({
        where: { nameFr: recipe.menuItemNameFr },
      });
      if (!menuItem) {
        console.warn(`  Menu item not found, skipping: ${recipe.menuItemNameFr}`);
        continue;
      }
      await prisma.menuItem.update({
        where: { id: menuItem.id },
        data: { workstationId: workstation.id },
      });
      for (const line of recipe.lines) {
        const ingredient = ingredientsByName.get(line.ingredient)!;
        await prisma.recipeItem.create({
          data: {
            menuItemId: menuItem.id,
            ingredientId: ingredient.id,
            size: line.size,
            quantity: line.quantity,
          },
        });
      }
    }

    for (const restock of yesterdayRestocks.filter((r) => r.workstation === ws.name)) {
      const wsIngredient = wsIngredientByIngredientName.get(restock.ingredient);
      if (!wsIngredient) continue;
      await prisma.stockRestock.create({
        data: {
          workstationIngredientId: wsIngredient.id,
          quantity: restock.quantity,
          note: "Livraison en cours de service",
          createdById: worker.id,
          createdAt: new Date(yesterday.getTime() + 15 * 3600 * 1000),
        },
      });
      await prisma.workstationIngredient.update({
        where: { id: wsIngredient.id },
        data: { currentQuantity: { increment: restock.quantity } },
      });
    }

    const counts = yesterdayCounts[ws.name] ?? {};
    const entries = Object.entries(counts)
      .map(([ingredientName, actualQuantity]) => {
        const wsIngredient = wsIngredientByIngredientName.get(ingredientName);
        if (!wsIngredient) return null;
        return { workstationIngredientId: wsIngredient.id, actualQuantity };
      })
      .filter((e): e is { workstationIngredientId: string; actualQuantity: number } => !!e);

    if (entries.length > 0) {
      await prisma.stockCount.create({
        data: {
          workstationId: workstation.id,
          date: yesterday,
          workerId: worker.id,
          createdAt: new Date(yesterday.getTime() + 22 * 3600 * 1000),
          entries: { create: entries },
        },
      });
    }
  }

  console.log("Recording yesterday's daily sales...");
  const salesItems: { menuItemId: string; size: string | null; quantitySold: number }[] = [];
  for (const [nameFr, bySize] of Object.entries(yesterdaySales)) {
    const menuItem = await prisma.menuItem.findFirst({ where: { nameFr } });
    if (!menuItem) continue;
    for (const [size, quantitySold] of Object.entries(bySize)) {
      salesItems.push({
        menuItemId: menuItem.id,
        size: size === "none" ? null : size,
        quantitySold,
      });
    }
  }

  const admin = await prisma.adminUser.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("No ADMIN user found — run db:ensure-admin first.");

  await prisma.dailySales.create({
    data: {
      date: yesterday,
      createdById: admin.id,
      items: { create: salesItems },
    },
  });

  console.log("Finalizing yesterday's stock counts (computing variance)...");
  for (const ws of workstations) {
    const workstation = await prisma.workstation.findFirst({ where: { name: ws.name } });
    if (!workstation) continue;
    await finalizeStockCount(workstation.id, yesterday);
  }

  console.log("\nStock management seed complete.");
  console.log(`Worker accounts (password: ${WORKER_PASSWORD}):`);
  for (const ws of workstations) {
    console.log(`  ${ws.workerEmail}  ->  ${ws.kitchenName} — ${ws.name}`);
  }
  console.log(
    `\nA finished day (${yesterday.toISOString().slice(0, 10)}) was seeded with sales, counts and computed variance.`
  );
  console.log("Check /admin/stock/variance to see it, and /admin/stock/count to try today's flow as a worker.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
