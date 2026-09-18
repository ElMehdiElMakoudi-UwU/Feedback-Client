import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { LoyaltySettingsView } from "./loyalty-settings-view";

export const dynamic = "force-dynamic";

export default async function LoyaltySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireAdmin();
  const { error, ok } = await searchParams;

  const offers = await prisma.loyaltyOffer.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return <LoyaltySettingsView offers={offers} error={error} ok={ok} />;
}
