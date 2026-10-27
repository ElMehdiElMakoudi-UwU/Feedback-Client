import type { MenuItem } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { fireOrderItems } from "../src/lib/kitchen";

// Dev/demo only. Sets up kitchen postes, routes the menu to them, then
// simulates a week of services plus a live rush so the poste screens, the
// passe and /admin/kitchen/performance have realistic data. The Pizza poste
// is deliberately understaffed and the juice bar overstaffed, so the advice
// engine has something to say. Re-running replaces the demo orders.
const HISTORY_DAYS = 7;
const ID_PREFIX = "kdsdemo-";

function makeRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
const rng = makeRng(20261027);
const randRange = (min: number, max: number) => min + rng() * (max - min);
const randInt = (min: number, max: number) => Math.floor(randRange(min, max + 1));

type PosteConfig = {
  name: string;
  targetMinutes: number;
  staffCount: number;
  baseMinutes: number; // time one cook spends on a ticket
  weight: number; // how often guests order from it
  categories: string[];
};

const POSTES: PosteConfig[] = [
  { name: "Tacos & Burgers", targetMinutes: 8, staffCount: 2, baseMinutes: 5, weight: 30, categories: ["Tacos", "Burger", "Wrap", "Shawarma"] },
  { name: "Pizza & Four", targetMinutes: 12, staffCount: 1, baseMinutes: 4.8, weight: 26, categories: ["Pizza", "Pasticcio", "Arancini"] },
  {
    name: "Chaud",
    targetMinutes: 15,
    staffCount: 2,
    baseMinutes: 10,
    weight: 22,
    categories: ["Les Entrées Chaudes", "Les Pâtes", "Les Risottos", "Fish, Meat & Poultry", "Les Incontournables", "Spécialités Marocaines", "Couscous Marocain", "Garnitures & Extras"],
  },
  { name: "Froid & Desserts", targetMinutes: 6, staffCount: 1, baseMinutes: 3, weight: 14, categories: ["Les Entrées Froides", "Desserts"] },
  { name: "Bar à jus", targetMinutes: 5, staffCount: 2, baseMinutes: 2, weight: 6, categories: ["SindiTropi..!!"] },
];

type MenuPick = { id: string; nameAr: string; nameFr: string; price: number };

async function setUpPostes() {
  const kitchen =
    (await prisma.kitchen.findFirst({ orderBy: { sortOrder: "asc" } })) ??
    (await prisma.kitchen.create({ data: { name: "Cuisine principale" } }));

  const stations: { config: PosteConfig; id: string; items: MenuPick[] }[] = [];
  for (const [index, config] of POSTES.entries()) {
    const existing = await prisma.workstation.findFirst({ where: { name: config.name } });
    const ws = existing
      ? await prisma.workstation.update({
          where: { id: existing.id },
          data: {
            targetMinutes: config.targetMinutes,
            staffCount: config.staffCount,
            syncWithOrder: config.name !== "Bar à jus",
          },
        })
      : await prisma.workstation.create({
          data: {
            kitchenId: kitchen.id,
            name: config.name,
            sortOrder: index,
            targetMinutes: config.targetMinutes,
            staffCount: config.staffCount,
            // Drinks go out as soon as they're made.
            syncWithOrder: config.name !== "Bar à jus",
          },
        });

    // Only route items nobody has routed yet.
    await prisma.menuItem.updateMany({
      where: { workstationId: null, category: { nameFr: { in: config.categories } } },
      data: { workstationId: ws.id },
    });
    const items = await prisma.menuItem.findMany({
      where: { workstationId: ws.id, price: { not: null } },
      select: { id: true, nameAr: true, nameFr: true, price: true },
    });
    stations.push({ config, id: ws.id, items: items.map((i) => ({ ...i, price: i.price! })) });
  }
  return stations.filter((s) => s.items.length > 0);
}

type Station = Awaited<ReturnType<typeof setUpPostes>>[number];

function pickStation(stations: Station[], boost?: string) {
  const weights = stations.map((s) => s.config.weight * (s.config.name === boost ? 2.5 : 1));
  let roll = rng() * weights.reduce((a, b) => a + b, 0);
  for (const [i, s] of stations.entries()) {
    roll -= weights[i];
    if (roll <= 0) return s;
  }
  return stations[0];
}

type SimLine = { station: Station; item: MenuPick; quantity: number };
type SimOrder = { createdAt: Date; firedAt: Date; lines: SimLine[] };

function buildOrder(stations: Station[], createdAt: Date, boost?: string): SimOrder {
  const lines: SimLine[] = [];
  const count = randInt(1, 4);
  for (let i = 0; i < count; i++) {
    const station = pickStation(stations, boost);
    const item = station.items[randInt(0, station.items.length - 1)];
    const existing = lines.find((l) => l.item.id === item.id);
    if (existing) existing.quantity++;
    else lines.push({ station, item, quantity: rng() < 0.2 ? 2 : 1 });
  }
  return { createdAt, firedAt: new Date(createdAt.getTime() + randRange(0.5, 3) * 60000), lines };
}

// Each poste is a small queue with `staffCount` cooks working tickets in arrival order.
function simulate(orders: SimOrder[], stations: Station[]) {
  const timings = new Map<SimOrder, Map<string, { start: Date; done: Date }>>();
  for (const order of orders) timings.set(order, new Map());

  for (const station of stations) {
    const cooks = Array.from({ length: Math.max(1, station.config.staffCount) }, () => 0);
    const tickets = orders
      .filter((o) => o.lines.some((l) => l.station.id === station.id))
      .sort((a, b) => a.firedAt.getTime() - b.firedAt.getTime());
    for (const order of tickets) {
      const qty = order.lines
        .filter((l) => l.station.id === station.id)
        .reduce((sum, l) => sum + l.quantity, 0);
      const arrival = order.firedAt.getTime();
      const cook = cooks.indexOf(Math.min(...cooks));
      const start = Math.max(arrival, cooks[cook]);
      const service = (station.config.baseMinutes * randRange(0.7, 1.3) + 0.6 * (qty - 1)) * 60000;
      cooks[cook] = start + service;
      timings.get(order)!.set(station.id, { start: new Date(start), done: new Date(start + service) });
    }
  }
  return timings;
}

// Guests per 15-minute slot across a service, peaking at 13h and 20h30.
function serviceArrivals(day: Date, until: number) {
  const arrivals: Date[] = [];
  const services = [
    { from: 12, to: 15, peak: 13.25, perSlot: 6 },
    { from: 19, to: 23, peak: 20.75, perSlot: 7 },
  ];
  for (const service of services) {
    for (let hour = service.from; hour < service.to; hour += 0.25) {
      const intensity = Math.exp(-((hour - service.peak) ** 2) / 1.2);
      const count = Math.round(service.perSlot * intensity * randRange(0.6, 1.3) + rng());
      for (let i = 0; i < count; i++) {
        const at = new Date(day);
        at.setHours(0, 0, 0, 0);
        at.setTime(at.getTime() + (hour + rng() * 0.25) * 3600000);
        if (at.getTime() < until) arrivals.push(at);
      }
    }
  }
  return arrivals.sort((a, b) => a.getTime() - b.getTime());
}

let sequence = 0;
function nextId() {
  sequence++;
  return `${ID_PREFIX}${Date.now().toString(36)}-${sequence}`;
}

async function writeOrders(
  orders: SimOrder[],
  timings: ReturnType<typeof simulate>,
  now: number,
  numberFrom: (order: SimOrder) => number
) {
  for (const order of orders) {
    const parts = timings.get(order)!;
    const lastDone = Math.max(...[...parts.values()].map((p) => p.done.getTime()));
    const allDone = lastDone <= now;
    const anyStarted = [...parts.values()].some((p) => p.start.getTime() <= now);
    const readyAt = allDone ? new Date(lastDone + randRange(0.3, 2) * 60000) : null;
    const isEvening = order.createdAt.getHours() >= 19;
    const completedAt = readyAt
      ? new Date(readyAt.getTime() + randRange(1, isEvening ? 7 : 4) * 60000)
      : null;

    let status = "PREPARING";
    if (!anyStarted) status = "CONFIRMED";
    if (readyAt && readyAt.getTime() <= now) status = "READY";
    if (completedAt && completedAt.getTime() <= now) status = "COMPLETED";

    await prisma.order.create({
      data: {
        id: nextId(),
        number: numberFrom(order),
        tableNumber: rng() < 0.25 ? "TAKEAWAY" : String(randInt(1, 24)),
        status,
        total: order.lines.reduce((sum, l) => sum + l.item.price * l.quantity, 0),
        createdAt: order.createdAt,
        readyAt: status === "READY" || status === "COMPLETED" ? readyAt : null,
        completedAt: status === "COMPLETED" ? completedAt : null,
        items: {
          create: order.lines.map((line) => {
            const timing = parts.get(line.station.id)!;
            return {
              menuItemId: line.item.id,
              nameAr: line.item.nameAr,
              nameFr: line.item.nameFr,
              unitPrice: line.item.price,
              quantity: line.quantity,
              createdAt: order.createdAt,
              workstationId: line.station.id,
              firedAt: order.firedAt,
              startedAt: timing.start.getTime() <= now ? timing.start : null,
              doneAt: timing.done.getTime() <= now ? timing.done : null,
            };
          }),
        },
      },
    });
  }
}

async function main() {
  const removed = await prisma.order.deleteMany({ where: { id: { startsWith: ID_PREFIX } } });
  if (removed.count) console.log(`Removed ${removed.count} previous demo orders`);

  const stations = await setUpPostes();
  console.log(`Postes: ${stations.map((s) => `${s.config.name} (${s.items.length} plats)`).join(", ")}`);

  const now = Date.now();
  const liveWindowStart = now - 30 * 60000;
  let historyCount = 0;

  for (let daysAgo = HISTORY_DAYS; daysAgo >= 0; daysAgo--) {
    const day = new Date(now);
    day.setDate(day.getDate() - daysAgo);
    const until = daysAgo === 0 ? liveWindowStart : Infinity;
    const orders = serviceArrivals(day, until).map((at) => buildOrder(stations, at));
    const timings = simulate(orders, stations);
    await writeOrders(orders, timings, now, (o) => orders.indexOf(o) + 1);
    historyCount += orders.length;
  }

  // Live rush over the last 30 minutes, heavy on pizza, so the screens show
  // queues and late tickets right now.
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const lastToday = await prisma.order.aggregate({
    where: { createdAt: { gte: todayStart } },
    _max: { number: true },
  });
  const live: SimOrder[] = [];
  for (let t = liveWindowStart; t < now - 60000; t += randRange(1.5, 3.5) * 60000) {
    live.push(buildOrder(stations, new Date(t), "Pizza & Four"));
  }
  const liveTimings = simulate(live, stations);
  await writeOrders(live, liveTimings, now, (o) => (lastToday._max.number ?? 0) + live.indexOf(o) + 1);

  console.log(`Created ${historyCount} historical orders and ${live.length} live orders`);

  // Orders split over several postes, confirmed through the real code path so
  // the faster postes get held to finish with the slowest one.
  // [category, dish] pairs: the menu reuses names like "Poulet" across categories.
  const examples = [
    [["Pizza", "Pizza Margarita"], ["Shawarma", "Shawarma Sindibad"], ["Les Entrées Froides", "Salade César Poulet"]],
    [["Pizza", "Pizza Shawarma"], ["Tacos", "Poulet"], ["Les Entrées Froides", "Salade Niçoise"]],
  ];
  let number = (lastToday._max.number ?? 0) + live.length;
  for (const [index, dishes] of examples.entries()) {
    const picked: MenuItem[] = [];
    for (const [category, name] of dishes) {
      const item = await prisma.menuItem.findFirst({
        where: { nameFr: name, category: { nameFr: category }, price: { not: null } },
      });
      if (item) picked.push(item);
    }
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          id: `${ID_PREFIX}sync-${index}`,
          number: ++number,
          tableNumber: String(10 + index),
          status: "CONFIRMED",
          total: picked.reduce((sum, i) => sum + i.price!, 0),
          items: {
            create: picked.map((i) => ({
              menuItemId: i.id,
              nameAr: i.nameAr,
              nameFr: i.nameFr,
              unitPrice: i.price!,
              quantity: 1,
            })),
          },
        },
      });
      await fireOrderItems(tx, order.id);
    });
    const fired = await prisma.orderItem.findMany({
      where: { orderId: `${ID_PREFIX}sync-${index}` },
      include: { workstation: { select: { name: true } } },
    });
    console.log(
      `Synced order #${number}: ` +
        fired
          .map((i) => `${i.nameFr} @ ${i.workstation?.name} ${i.holdUntil ? `held ${Math.round((i.holdUntil.getTime() - Date.now()) / 6000) / 10} min` : "starts now"}`)
          .join(" | ")
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
