import { prisma } from "../src/lib/prisma";
import { getISOWeekKey } from "../src/lib/week";

// Backfills months of customer feedback (table ratings, dish ratings,
// weekly-draw entries and past winners) so /admin/feedback and /admin/draw
// have realistic history to show, instead of a single empty state.
const HISTORY_DAYS = 120;

// Deterministic PRNG (same recipe as seed-stock-history.ts) so re-running
// this script reproduces the same data.
function makeRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
const rng = makeRng(20260615);
const randRange = (min: number, max: number) => min + rng() * (max - min);
const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];

function dayOfWeekFactor(date: Date) {
  const d = date.getUTCDay();
  if (d === 5 || d === 6) return 1.6; // Friday/Saturday: busier, more feedback
  if (d === 1) return 0.7;
  return 1.0;
}

// Menu items guests are prompted to rate, spanning several posts so the
// per-dish breakdown on /admin/feedback has spread across the menu.
const ratedMenuItemNames = [
  "Poulet",
  "Viande Hachée",
  "Pizza Margarita",
  "Pizza Poulet Et Champignons",
  "Pasticcio Poulet",
  "Suprême Poulet",
  "Entrecôte De Bœuf",
  "Salade Niçoise",
  "Salade Fruits De Mer",
  "Tiramisu",
  "Chocolat Fondu",
  "Chicken Burger",
  "Wrap Poulet",
  "Ananas Fresh Boost",
];

// This dish is deliberately biased low, and its name shows up in the
// negative comments below, so the "needs attention" flag on the admin
// dashboard has a genuine, explainable reason to trigger.
const PROBLEM_ITEM = "Salade Fruits De Mer";

const positiveCommentsFr = [
  "Excellent repas, on reviendra !",
  "Service rapide et souriant, bravo.",
  "Le poulet était parfaitement cuit, un régal.",
  "Très bon rapport qualité-prix.",
  "Ambiance top, plats délicieux.",
  "La pizza était incroyable, pâte fine et croustillante.",
  "Meilleur tacos de la ville !",
  "Personnel très accueillant, merci.",
];
const positiveCommentsAr = [
  "أكل رائع، سنعود بالتأكيد!",
  "خدمة سريعة ومبتسمة، برافو.",
  "الدجاج كان مطبوخاً بشكل مثالي.",
  "جودة ممتازة بسعر معقول.",
  "جو المكان رائع والأطباق لذيذة.",
  "أفضل تاكوس في المدينة!",
];
const neutralCommentsFr = [
  "Correct, sans plus.",
  "Bien mais un peu long à venir.",
  "Portions un peu petites pour le prix.",
  "Ça peut aller, rien d'exceptionnel.",
];
const neutralCommentsAr = ["عادي، لا بأس به.", "جيد لكن الانتظار طويل نوعاً ما."];
const negativeCommentsFr = [
  `La ${PROBLEM_ITEM} était trop salée et pas fraîche.`,
  `Déçu par la ${PROBLEM_ITEM}, les fruits de mer manquaient de fraîcheur.`,
  "Service très lent ce soir, on a attendu 40 minutes.",
  "Le plat est arrivé froid, dommage.",
  "Pour le prix, je m'attendais à mieux.",
  `${PROBLEM_ITEM} à revoir, trop d'assaisonnement.`,
];
const negativeCommentsAr = [
  `${PROBLEM_ITEM} كانت مالحة جداً وغير طازجة.`,
  "الخدمة كانت بطيئة جداً هذا المساء.",
  "الطبق وصل بارداً، للأسف.",
  "بالنسبة للسعر، توقعت أفضل من هذا.",
];

function weightedRating(problemBias: boolean): number {
  // Mostly happy customers (4-5), some 3s, occasional real complaints —
  // except when explicitly rating the problem dish, which skews low.
  if (problemBias && rng() < 0.65) return rng() < 0.5 ? 1 : 2;
  const r = rng();
  if (r < 0.55) return 5;
  if (r < 0.8) return 4;
  if (r < 0.92) return 3;
  if (r < 0.97) return 2;
  return 1;
}

function commentFor(rating: number): string | null {
  if (rating <= 2) {
    if (rng() < 0.15) return null;
    return rng() < 0.5 ? pick(negativeCommentsFr) : pick(negativeCommentsAr);
  }
  if (rating === 3) {
    if (rng() < 0.5) return null;
    return rng() < 0.5 ? pick(neutralCommentsFr) : pick(neutralCommentsAr);
  }
  if (rng() < 0.55) return null;
  return rng() < 0.5 ? pick(positiveCommentsFr) : pick(positiveCommentsAr);
}

function fakeMoroccanPhone(): string {
  const prefix = pick(["06", "07"]);
  let rest = "";
  for (let i = 0; i < 8; i++) rest += Math.floor(rng() * 10);
  return `${prefix}${rest}`;
}

async function main() {
  console.log("Clearing existing feedback/draw data...");
  // ItemRating and DrawWinner both cascade-delete with their Feedback row.
  await prisma.feedback.deleteMany();

  const menuItems = await prisma.menuItem.findMany({
    where: { nameFr: { in: ratedMenuItemNames } },
    select: { id: true, nameFr: true },
  });
  const menuItemByName = new Map(menuItems.map((m) => [m.nameFr, m]));
  const otherItems = menuItems.filter((m) => m.nameFr !== PROBLEM_ITEM);
  const problemItem = menuItemByName.get(PROBLEM_ITEM);
  if (menuItems.length === 0) {
    throw new Error("No matching menu items found — run db:seed first.");
  }

  const today = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
  const startDay = new Date(today.getTime() - HISTORY_DAYS * 24 * 3600 * 1000);
  const currentWeekKey = getISOWeekKey(new Date());

  // weekKey -> feedback entries that opted into the draw, to pick a past
  // winner from once the week is over.
  const drawEntriesByWeek = new Map<string, { feedbackId: string }[]>();
  // weekKey -> latest entry's createdAt, so the winner's pickedAt can land
  // realistically just after that week ended, instead of all on today.
  const weekLastSeenAt = new Map<string, Date>();

  console.log(`Simulating ${HISTORY_DAYS} days of guest feedback from ${startDay.toISOString().slice(0, 10)}...`);

  let created = 0;
  for (let offset = 0; offset < HISTORY_DAYS; offset++) {
    const day = new Date(startDay.getTime() + offset * 24 * 3600 * 1000);
    if (day.getTime() >= today.getTime()) break; // leave today for live testing

    const count = Math.max(0, Math.round(randRange(1, 4) * dayOfWeekFactor(day)));

    for (let i = 0; i < count; i++) {
      const createdAt = new Date(
        day.getTime() + (12 + randRange(0, 11)) * 3600 * 1000 // sometime between noon and 11pm
      );
      const tableNumber = String(1 + Math.floor(rng() * 14));
      const foodRating = weightedRating(false);
      const serviceRating = weightedRating(false);
      const worstRating = Math.min(foodRating, serviceRating);
      const comment = commentFor(worstRating);

      const enteredDraw = rng() < 0.35;
      const phone = enteredDraw ? fakeMoroccanPhone() : null;
      const weekKey = enteredDraw ? getISOWeekKey(createdAt) : null;

      // 1-3 dish ratings per visit; the problem dish is deliberately
      // over-sampled (~1 in 6 visits) to build up a real pattern.
      const itemRatingsData: { menuItemId: string; rating: number }[] = [];
      const includeProblem = problemItem && rng() < 0.17;
      if (includeProblem && problemItem) {
        itemRatingsData.push({ menuItemId: problemItem.id, rating: weightedRating(true) });
      }
      const extraCount = Math.floor(randRange(1, 3));
      const shuffled = [...otherItems].sort(() => rng() - 0.5);
      for (const item of shuffled.slice(0, extraCount)) {
        itemRatingsData.push({ menuItemId: item.id, rating: weightedRating(false) });
      }

      const feedback = await prisma.feedback.create({
        data: {
          tableNumber,
          foodRating,
          serviceRating,
          comment,
          enteredDraw,
          phone,
          weekKey,
          createdAt,
          itemRatings: itemRatingsData.length ? { create: itemRatingsData } : undefined,
        },
      });
      created++;

      if (weekKey) {
        const list = drawEntriesByWeek.get(weekKey) ?? [];
        list.push({ feedbackId: feedback.id });
        drawEntriesByWeek.set(weekKey, list);
        const lastSeen = weekLastSeenAt.get(weekKey);
        if (!lastSeen || createdAt > lastSeen) weekLastSeenAt.set(weekKey, createdAt);
      }
    }

    if (offset % 20 === 0) console.log(`  ${day.toISOString().slice(0, 10)} (${offset + 1}/${HISTORY_DAYS})`);
  }

  console.log("Picking past weekly draw winners...");
  let winners = 0;
  for (const [weekKey, entries] of drawEntriesByWeek) {
    if (weekKey === currentWeekKey || entries.length === 0) continue;
    const winner = pick(entries);
    const lastSeen = weekLastSeenAt.get(weekKey) ?? today;
    const pickedAt = new Date(lastSeen.getTime() + randRange(12, 48) * 3600 * 1000);
    await prisma.drawWinner.create({ data: { weekKey, feedbackId: winner.feedbackId, pickedAt } });
    winners++;
  }

  console.log(`\nFeedback seed complete: ${created} feedback entries, ${winners} past weekly winners.`);
  console.log("Check /admin/feedback and /admin/draw to see it.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
