import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import {
  LOW_RATING_THRESHOLD,
  type RecoveryStatus,
  type RootCause,
} from "@/lib/recovery";
import { RecoveryView } from "./recovery-view";

export const dynamic = "force-dynamic";

const STATS_WINDOW_DAYS = 30;

export default async function RecoveryPage() {
  await requireAdmin();

  const since = new Date();
  since.setDate(since.getDate() - STATS_WINDOW_DAYS);

  const [openCases, recentCases] = await Promise.all([
    // Every open case, however old, so nothing slips off the list.
    prisma.feedback.findMany({
      where: { recoveryStatus: "OPEN" },
      orderBy: { createdAt: "asc" },
      include: {
        itemRatings: {
          where: { rating: { lte: LOW_RATING_THRESHOLD } },
          include: { menuItem: { select: { nameAr: true, nameFr: true } } },
        },
        handledBy: { select: { email: true } },
      },
    }),
    prisma.feedback.findMany({
      where: {
        recoveryStatus: { not: null },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      include: {
        itemRatings: {
          where: { rating: { lte: LOW_RATING_THRESHOLD } },
          include: { menuItem: { select: { nameAr: true, nameFr: true } } },
        },
        handledBy: { select: { email: true } },
      },
    }),
  ]);

  const handled = recentCases.filter(
    (c) => c.recoveryStatus !== "OPEN" && c.handledAt
  );
  const handledRate = recentCases.length
    ? Math.round((handled.length / recentCases.length) * 100)
    : null;
  const responseMinutes = handled
    .map((c) => (c.handledAt!.getTime() - c.createdAt.getTime()) / 60000)
    .sort((a, b) => a - b);
  const medianResponseMinutes = responseMinutes.length
    ? Math.round(responseMinutes[Math.floor(responseMinutes.length / 2)])
    : null;

  const causeCounts = new Map<RootCause, number>();
  for (const c of recentCases) {
    if (!c.rootCause) continue;
    const cause = c.rootCause as RootCause;
    causeCounts.set(cause, (causeCounts.get(cause) ?? 0) + 1);
  }
  const topCauses = Array.from(causeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([cause, count]) => ({ cause, count }));

  const byId = new Map(
    [...openCases, ...recentCases].map((c) => [c.id, c] as const)
  );

  return (
    <RecoveryView
      statsWindowDays={STATS_WINDOW_DAYS}
      stats={{
        open: openCases.length,
        total: recentCases.length,
        handledRate,
        medianResponseMinutes,
        topCauses,
      }}
      cases={Array.from(byId.values())
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((c) => ({
          id: c.id,
          tableNumber: c.tableNumber,
          foodRating: c.foodRating,
          serviceRating: c.serviceRating,
          comment: c.comment,
          lowItems: c.itemRatings.map((r) => ({
            nameAr: r.menuItem.nameAr,
            nameFr: r.menuItem.nameFr,
            rating: r.rating,
          })),
          // The draw phone was only given for the draw, so it's shown only
          // when the guest agreed to be contacted about this visit.
          phone: c.contactConsent ? c.phone : null,
          managerRequested: c.managerRequested,
          status: c.recoveryStatus as RecoveryStatus,
          rootCause: c.rootCause as RootCause | null,
          note: c.recoveryNote,
          handledBy: c.handledBy?.email ?? null,
          handledAt: c.handledAt?.toISOString() ?? null,
          createdAt: c.createdAt.toISOString(),
        }))}
    />
  );
}
