import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { finalizeStockCount, normalizeToDay } from "../src/lib/stock";

// Rebuilds the whole stock-management dataset (same shape as seed-stock.ts)
// then simulates this many past days of real usage — daily sales, opening
// and closing counts, occasional restocks and shrinkage — so dashboards like
// /admin/stock/consumption and /admin/stock/variance have months of history
// to show trends on, instead of a single seeded day. Today itself is left
// untouched so it can still be used to test the live worker flow.
const HISTORY_DAYS = 120;

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
  { name: "Fromage", unit: "Kg" },
  { name: "Pain Burger", unit: "Unit" },
  { name: "Galette", unit: "Unit" },
  { name: "Ananas", unit: "Kg" },
  { name: "Banane", unit: "Kg" },
  { name: "Avocat", unit: "Kg" },
  { name: "Miel", unit: "Kg" },
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
  {
    kitchenName: "Cuisine 3",
    name: "Burgers",
    workerEmail: "burgers@sindibad.local",
    openingStock: [
      { ingredient: "Pain Burger", quantity: 80 },
      { ingredient: "Poulet", quantity: 12 },
      { ingredient: "Viande hachée", quantity: 12 },
      { ingredient: "Fromage", quantity: 8 },
    ],
    recipes: [
      {
        menuItemNameFr: "Chicken Burger",
        lines: [
          { ingredient: "Pain Burger", size: null, quantity: 1 },
          { ingredient: "Poulet", size: null, quantity: 0.12 },
        ],
      },
      {
        menuItemNameFr: "Cheese Burger",
        lines: [
          { ingredient: "Pain Burger", size: null, quantity: 1 },
          { ingredient: "Viande hachée", size: null, quantity: 0.12 },
          { ingredient: "Fromage", size: null, quantity: 0.05 },
        ],
      },
      {
        menuItemNameFr: "American Burger",
        lines: [
          { ingredient: "Pain Burger", size: null, quantity: 1 },
          { ingredient: "Viande hachée", size: null, quantity: 0.15 },
          { ingredient: "Fromage", size: null, quantity: 0.05 },
        ],
      },
      {
        menuItemNameFr: "Double Cheese Burger",
        lines: [
          { ingredient: "Pain Burger", size: null, quantity: 1 },
          { ingredient: "Viande hachée", size: null, quantity: 0.25 },
          { ingredient: "Fromage", size: null, quantity: 0.1 },
        ],
      },
      {
        menuItemNameFr: "Double Chicken Burger",
        lines: [
          { ingredient: "Pain Burger", size: null, quantity: 1 },
          { ingredient: "Poulet", size: null, quantity: 0.22 },
        ],
      },
      {
        menuItemNameFr: "Mexican Burger",
        lines: [
          { ingredient: "Pain Burger", size: null, quantity: 1 },
          { ingredient: "Viande hachée", size: null, quantity: 0.15 },
          { ingredient: "Fromage", size: null, quantity: 0.05 },
        ],
      },
    ],
  },
  {
    kitchenName: "Cuisine 3",
    name: "Wraps & Shawarma",
    workerEmail: "wraps@sindibad.local",
    openingStock: [
      { ingredient: "Galette", quantity: 70 },
      { ingredient: "Poulet", quantity: 12 },
      { ingredient: "Bœuf", quantity: 6 },
    ],
    recipes: [
      {
        menuItemNameFr: "Wrap Poulet",
        lines: [
          { ingredient: "Galette", size: null, quantity: 1 },
          { ingredient: "Poulet", size: null, quantity: 0.12 },
        ],
      },
      {
        menuItemNameFr: "Wrap César",
        lines: [
          { ingredient: "Galette", size: null, quantity: 1 },
          { ingredient: "Poulet", size: null, quantity: 0.1 },
        ],
      },
      {
        menuItemNameFr: "Shawarma 3ich",
        lines: [
          { ingredient: "Galette", size: null, quantity: 1 },
          { ingredient: "Poulet", size: null, quantity: 0.15 },
        ],
      },
      {
        menuItemNameFr: "Shawarma Sindibad",
        lines: [
          { ingredient: "Galette", size: null, quantity: 1 },
          { ingredient: "Bœuf", size: null, quantity: 0.1 },
          { ingredient: "Poulet", size: null, quantity: 0.1 },
        ],
      },
    ],
  },
  {
    kitchenName: "Cuisine 4",
    name: "Jus & Smoothies",
    workerEmail: "smoothies@sindibad.local",
    openingStock: [
      { ingredient: "Ananas", quantity: 15 },
      { ingredient: "Banane", quantity: 10 },
      { ingredient: "Avocat", quantity: 8 },
      { ingredient: "Miel", quantity: 6 },
      { ingredient: "Chocolat", quantity: 4 },
    ],
    recipes: [
      {
        menuItemNameFr: "Royal Tropical Mix",
        lines: [
          { ingredient: "Ananas", size: null, quantity: 0.15 },
          { ingredient: "Banane", size: null, quantity: 0.1 },
        ],
      },
      {
        menuItemNameFr: "Avocado Gold Smoothie",
        lines: [
          { ingredient: "Avocat", size: null, quantity: 0.2 },
          { ingredient: "Miel", size: null, quantity: 0.05 },
        ],
      },
      {
        menuItemNameFr: "Jus des Jardins Marocains",
        lines: [
          { ingredient: "Ananas", size: null, quantity: 0.1 },
          { ingredient: "Banane", size: null, quantity: 0.1 },
        ],
      },
      {
        menuItemNameFr: "Choco-Banane Deluxe",
        lines: [
          { ingredient: "Banane", size: null, quantity: 0.15 },
          { ingredient: "Chocolat", size: null, quantity: 0.05 },
        ],
      },
      {
        menuItemNameFr: "Smoothie des Sages",
        lines: [
          { ingredient: "Ananas", size: null, quantity: 0.1 },
          { ingredient: "Miel", size: null, quantity: 0.03 },
        ],
      },
      {
        menuItemNameFr: "Ananas Fresh Boost",
        lines: [{ ingredient: "Ananas", size: null, quantity: 0.2 }],
      },
    ],
  },
];

// Baseline daily sales per menu item — each simulated day multiplies this by
// a day-of-week factor and random noise, so the history isn't a flat line.
const baseSales: Record<string, Record<string, number>> = {
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
  "Chicken Burger": { none: 14 },
  "Cheese Burger": { none: 10 },
  "American Burger": { none: 8 },
  "Double Cheese Burger": { none: 6 },
  "Double Chicken Burger": { none: 6 },
  "Mexican Burger": { none: 5 },
  "Wrap Poulet": { none: 9 },
  "Wrap César": { none: 6 },
  "Shawarma 3ich": { none: 4 },
  "Shawarma Sindibad": { none: 4 },
  "Royal Tropical Mix": { none: 8 },
  "Avocado Gold Smoothie": { none: 6 },
  "Jus des Jardins Marocains": { none: 7 },
  "Choco-Banane Deluxe": { none: 5 },
  "Smoothie des Sages": { none: 4 },
  "Ananas Fresh Boost": { none: 6 },
};

// Deterministic PRNG so re-running the script reproduces the same history.
function makeRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
const rng = makeRng(20260101);
const randRange = (min: number, max: number) => min + rng() * (max - min);

function dayOfWeekFactor(date: Date) {
  const d = date.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  if (d === 5 || d === 6) return 1.3; // Friday/Saturday: busier
  if (d === 1) return 0.8; // Monday: slower
  return 1.0;
}

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

  const admin = await prisma.adminUser.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("No ADMIN user found — run db:ensure-admin first.");

  console.log("Creating kitchens...");
  const kitchenNames = [...new Set(workstations.map((w) => w.kitchenName))];
  const kitchensByName = new Map<string, { id: string }>();
  for (let i = 0; i < kitchenNames.length; i++) {
    const kitchen = await prisma.kitchen.create({ data: { name: kitchenNames[i], sortOrder: i } });
    kitchensByName.set(kitchenNames[i], kitchen);
  }

  console.log("Creating ingredients...");
  const ingredientsByName = new Map<string, { id: string }>();
  for (const ing of ingredients) {
    const created = await prisma.ingredient.create({ data: ing });
    ingredientsByName.set(ing.name, created);
  }

  console.log("Creating workstations, workers and recipes...");
  const workstationByName = new Map<string, { id: string }>();
  const workerByWorkstationId = new Map<string, { id: string }>();
  // Local mirror of each workstation ingredient's running quantity + its
  // "full restock" baseline, kept in sync as the day loop below progresses.
  const wsIngredientState = new Map<
    string,
    { id: string; workstationId: string; ingredientId: string; currentQuantity: number; baseline: number }
  >();
  // menuItemId -> the recipe/workstation info needed to compute consumption.
  const menuItemInfo = new Map<
    string,
    { workstationId: string; recipeItems: { ingredientId: string; size: string | null; quantity: number }[] }
  >();

  for (let i = 0; i < workstations.length; i++) {
    const ws = workstations[i];
    const kitchen = kitchensByName.get(ws.kitchenName)!;
    const workstation = await prisma.workstation.create({
      data: { kitchenId: kitchen.id, name: ws.name, sortOrder: i },
    });
    workstationByName.set(ws.name, workstation);

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
      wsIngredientState.set(wsIngredient.id, {
        id: wsIngredient.id,
        workstationId: workstation.id,
        ingredientId: ingredient.id,
        currentQuantity: stock.quantity,
        baseline: stock.quantity,
      });
    }

    const passwordHash = await bcrypt.hash(WORKER_PASSWORD, 10);
    const worker = await prisma.adminUser.create({
      data: { email: ws.workerEmail, passwordHash, role: "WORKER", workstationId: workstation.id },
    });
    workerByWorkstationId.set(workstation.id, worker);

    for (const recipe of ws.recipes) {
      const menuItem = await prisma.menuItem.findFirst({ where: { nameFr: recipe.menuItemNameFr } });
      if (!menuItem) {
        console.warn(`  Menu item not found, skipping: ${recipe.menuItemNameFr}`);
        continue;
      }
      await prisma.menuItem.update({ where: { id: menuItem.id }, data: { workstationId: workstation.id } });

      const recipeItems: { ingredientId: string; size: string | null; quantity: number }[] = [];
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
        recipeItems.push({ ingredientId: ingredient.id, size: line.size, quantity: line.quantity });
      }
      menuItemInfo.set(menuItem.id, { workstationId: workstation.id, recipeItems });
    }
  }

  const menuItemIdByNameFr = new Map<string, string>();
  for (const nameFr of Object.keys(baseSales)) {
    const menuItem = await prisma.menuItem.findFirst({ where: { nameFr } });
    if (menuItem) menuItemIdByNameFr.set(nameFr, menuItem.id);
  }

  const today = normalizeToDay(new Date());
  const startDay = normalizeToDay(new Date(today.getTime() - HISTORY_DAYS * 24 * 3600 * 1000));

  console.log(`Simulating ${HISTORY_DAYS} days of activity from ${startDay.toISOString().slice(0, 10)}...`);

  for (let offset = 0; offset < HISTORY_DAYS; offset++) {
    const day = normalizeToDay(new Date(startDay.getTime() + offset * 24 * 3600 * 1000));
    if (day.getTime() >= today.getTime()) break; // never touch today — left for live testing

    if (offset % 10 === 0) console.log(`  ${day.toISOString().slice(0, 10)} (${offset + 1}/${HISTORY_DAYS})`);

    // 1. Opening count: worker confirms the counter as it stands.
    for (const ws of workstations) {
      const workstation = workstationByName.get(ws.name)!;
      const worker = workerByWorkstationId.get(workstation.id)!;
      const wsIngredients = [...wsIngredientState.values()].filter((wi) => wi.workstationId === workstation.id);
      if (wsIngredients.length === 0) continue;
      await prisma.stockCount.create({
        data: {
          workstationId: workstation.id,
          date: day,
          period: "OPENING",
          workerId: worker.id,
          finalizedAt: new Date(day.getTime() + 8 * 3600 * 1000),
          createdAt: new Date(day.getTime() + 8 * 3600 * 1000),
          entries: {
            create: wsIngredients.map((wi) => ({
              workstationIngredientId: wi.id,
              actualQuantity: wi.currentQuantity,
            })),
          },
        },
      });
    }

    // 2. Occasional mid-shift restocks, more likely once stock is running low.
    for (const wi of wsIngredientState.values()) {
      const runningLow = wi.currentQuantity < wi.baseline * 0.35;
      if (rng() < (runningLow ? 0.7 : 0.15)) {
        const worker = workerByWorkstationId.get(wi.workstationId)!;
        const quantity = Math.round(wi.baseline * randRange(0.4, 0.7) * 100) / 100;
        await prisma.stockRestock.create({
          data: {
            workstationIngredientId: wi.id,
            quantity,
            note: "Livraison en cours de service",
            createdById: worker.id,
            createdAt: new Date(day.getTime() + 15 * 3600 * 1000),
          },
        });
        wi.currentQuantity += quantity;
        await prisma.workstationIngredient.update({
          where: { id: wi.id },
          data: { currentQuantity: wi.currentQuantity },
        });
      }
    }

    // 3. Daily sales, varying by weekday and random noise.
    const salesItems: { menuItemId: string; size: string | null; quantitySold: number }[] = [];
    for (const [nameFr, bySize] of Object.entries(baseSales)) {
      const menuItemId = menuItemIdByNameFr.get(nameFr);
      if (!menuItemId) continue;
      for (const [size, base] of Object.entries(bySize)) {
        const quantitySold = Math.max(0, Math.round(base * dayOfWeekFactor(day) * randRange(0.7, 1.3)));
        if (quantitySold <= 0) continue;
        salesItems.push({ menuItemId, size: size === "none" ? null : size, quantitySold });
      }
    }
    await prisma.dailySales.create({ data: { date: day, createdById: admin.id, items: { create: salesItems } } });

    // 4. Expected consumption per (workstation, ingredient), from sales x recipe.
    const expectedByKey = new Map<string, number>();
    for (const item of salesItems) {
      const info = menuItemInfo.get(item.menuItemId);
      if (!info) continue;
      for (const recipeItem of info.recipeItems) {
        if (recipeItem.size && recipeItem.size !== item.size) continue;
        if (!recipeItem.size && item.size) continue;
        const key = `${info.workstationId}:${recipeItem.ingredientId}`;
        expectedByKey.set(key, (expectedByKey.get(key) ?? 0) + recipeItem.quantity * item.quantitySold);
      }
    }

    // 5. Closing count: physical count drifts from the expected baseline —
    // small day-to-day noise, plus an occasional bigger shrinkage/spillage.
    for (const ws of workstations) {
      const workstation = workstationByName.get(ws.name)!;
      const worker = workerByWorkstationId.get(workstation.id)!;
      const wsIngredients = [...wsIngredientState.values()].filter((wi) => wi.workstationId === workstation.id);
      if (wsIngredients.length === 0) continue;

      const entries: { workstationIngredientId: string; actualQuantity: number }[] = [];
      for (const wi of wsIngredients) {
        const expectedConsumption = expectedByKey.get(`${workstation.id}:${wi.ingredientId}`) ?? 0;
        const noiseScale = Math.max(expectedConsumption, 1) * 0.05;
        let noise = randRange(-noiseScale, noiseScale);
        if (rng() < 0.08) noise -= Math.max(expectedConsumption, 2) * randRange(0.3, 0.8);
        const actualQuantity = Math.max(0, Math.round((wi.currentQuantity - expectedConsumption + noise) * 100) / 100);
        entries.push({ workstationIngredientId: wi.id, actualQuantity });
      }

      await prisma.stockCount.create({
        data: {
          workstationId: workstation.id,
          date: day,
          period: "CLOSING",
          workerId: worker.id,
          createdAt: new Date(day.getTime() + 22 * 3600 * 1000),
          entries: { create: entries },
        },
      });
    }

    // 6. Finalize: computes expectedQuantity/variance and rolls currentQuantity forward.
    for (const ws of workstations) {
      const workstation = workstationByName.get(ws.name)!;
      await finalizeStockCount(workstation.id, day);
    }

    // 7. Mirror the post-finalize currentQuantity back into local state for tomorrow.
    const refreshed = await prisma.workstationIngredient.findMany({
      select: { id: true, currentQuantity: true },
    });
    for (const row of refreshed) {
      const state = wsIngredientState.get(row.id);
      if (state) state.currentQuantity = row.currentQuantity;
    }
  }

  console.log("\nStock management history seed complete.");
  console.log(`Worker accounts (password: ${WORKER_PASSWORD}):`);
  for (const ws of workstations) {
    console.log(`  ${ws.workerEmail}  ->  ${ws.kitchenName} — ${ws.name}`);
  }
  console.log(
    `\n${HISTORY_DAYS} days of sales, counts, restocks and variance were simulated, ending yesterday.`
  );
  console.log("Check /admin/stock/consumption or /admin/stock/variance and page back through dates to see the trend.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
