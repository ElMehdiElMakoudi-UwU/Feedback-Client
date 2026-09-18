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

  const [workstation, existingCount] = await Promise.all([
    prisma.workstation.findUnique({
      where: { id: worker.workstationId },
      include: {
        kitchen: true,
        ingredients: { orderBy: { sortOrder: "asc" }, include: { ingredient: true } },
      },
    }),
    prisma.stockCount.findUnique({
      where: {
        workstationId_date: { workstationId: worker.workstationId, date: today },
      },
      include: { entries: true },
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
      alreadySubmitted={!!existingCount}
      existingEntries={existingCount?.entries ?? []}
    />
  );
}
