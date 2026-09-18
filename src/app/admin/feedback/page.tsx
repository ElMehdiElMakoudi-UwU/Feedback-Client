import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { AdminFeedbackView } from "./feedback-view";

export const dynamic = "force-dynamic";

function average(values: number[]): string {
  if (values.length === 0) return "-";
  return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
}

export default async function AdminFeedbackPage() {
  await requireAdmin();

  const feedback = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const foodAvg = average(feedback.map((f) => f.foodRating));
  const serviceAvg = average(feedback.map((f) => f.serviceRating));
  const lowRatingCount = feedback.filter(
    (f) => f.foodRating <= 2 || f.serviceRating <= 2
  ).length;

  const itemRatings = await prisma.itemRating.findMany({
    include: { menuItem: { select: { nameAr: true, nameFr: true } } },
  });

  const itemStats = new Map<
    string,
    { nameAr: string; nameFr: string; ratings: number[] }
  >();
  for (const rating of itemRatings) {
    if (!rating.menuItem) continue;
    const entry = itemStats.get(rating.menuItemId) ?? {
      nameAr: rating.menuItem.nameAr,
      nameFr: rating.menuItem.nameFr,
      ratings: [],
    };
    entry.ratings.push(rating.rating);
    itemStats.set(rating.menuItemId, entry);
  }

  const itemRatingSummaries = Array.from(itemStats.entries())
    .map(([menuItemId, { nameAr, nameFr, ratings }]) => ({
      menuItemId,
      nameAr,
      nameFr,
      count: ratings.length,
      average: ratings.reduce((a, b) => a + b, 0) / ratings.length,
    }))
    .sort((a, b) => a.average - b.average);

  return (
    <AdminFeedbackView
      feedback={feedback}
      foodAvg={foodAvg}
      serviceAvg={serviceAvg}
      lowRatingCount={lowRatingCount}
      itemRatingSummaries={itemRatingSummaries}
    />
  );
}
