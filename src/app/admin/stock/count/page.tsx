import { prisma } from "@/lib/prisma";
import { requireWorker } from "@/lib/require-admin";
import { normalizeToDay } from "@/lib/stock";
import { StockCountView } from "./stock-count-view";

export const dynamic = "force-dynamic";

export default async function StockCountPage() {
  const worker = await requireWorker();

  if (!worker.workstationId) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sm text-neutral-500">
          Aucun poste ne vous est assigné. Contactez un administrateur.
        </p>
      </main>
    );
  }

  const today = normalizeToDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [workstation, openingCount, closingCount, todayRestocks] = await Promise.all([
    prisma.workstation.findUnique({
      where: { id: worker.workstationId },
      include: {
        kitchen: true,
        ingredients: { orderBy: { sortOrder: "asc" }, include: { ingredient: true } },
      },
    }),
    prisma.stockCount.findUnique({
      where: {
        workstationId_date_period: {
          workstationId: worker.workstationId,
          date: today,
          period: "OPENING",
        },
      },
      include: { entries: true },
    }),
    prisma.stockCount.findUnique({
      where: {
        workstationId_date_period: {
          workstationId: worker.workstationId,
          date: today,
          period: "CLOSING",
        },
      },
      include: { entries: true },
    }),
    prisma.stockRestock.findMany({
      where: {
        workstationIngredient: { workstationId: worker.workstationId },
        createdAt: { gte: today, lt: tomorrow },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        workstationIngredientId: true,
        quantity: true,
        note: true,
        photoUrl: true,
        createdAt: true,
      },
    }),
  ]);

  if (!workstation) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sm text-neutral-500">Poste introuvable.</p>
      </main>
    );
  }

  return (
    <StockCountView
      workstation={workstation}
      openingSubmitted={!!openingCount}
      closingSubmitted={!!closingCount}
      openingEntries={openingCount?.entries ?? []}
      closingEntries={closingCount?.entries ?? []}
      todayRestocks={todayRestocks.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
      today={today.toISOString()}
    />
  );
}
