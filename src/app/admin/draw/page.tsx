import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { getISOWeekKey } from "@/lib/week";
import { AdminDrawView } from "./draw-view";

export const dynamic = "force-dynamic";

export default async function AdminDrawPage() {
  await requireAdmin();

  const weekKey = getISOWeekKey(new Date());

  const [currentWinner, eligibleEntries, pastWinners] = await Promise.all([
    prisma.drawWinner.findUnique({
      where: { weekKey },
      include: { feedback: true },
    }),
    prisma.feedback.findMany({
      where: { weekKey, enteredDraw: true, phone: { not: null } },
    }),
    prisma.drawWinner.findMany({
      where: { weekKey: { not: weekKey } },
      include: { feedback: true },
      orderBy: { pickedAt: "desc" },
      take: 12,
    }),
  ]);

  const uniquePhones = new Set(eligibleEntries.map((e) => e.phone)).size;

  return (
    <AdminDrawView
      weekKey={weekKey}
      currentWinner={currentWinner}
      uniquePhones={uniquePhones}
      pastWinners={pastWinners}
    />
  );
}
