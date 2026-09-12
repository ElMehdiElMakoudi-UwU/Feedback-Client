import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-admin";
import { LoyaltyView } from "./loyalty-view";

export const dynamic = "force-dynamic";

export default async function LoyaltyPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; error?: string; ok?: string }>;
}) {
  await requireStaff();
  const { phone, error, ok } = await searchParams;
  const trimmedPhone = phone?.trim() || "";

  const customer = trimmedPhone
    ? await prisma.customer.findUnique({
        where: { phone: trimmedPhone },
        include: {
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 15,
          },
        },
      })
    : null;

  return (
    <LoyaltyView
      phone={trimmedPhone}
      customer={customer}
      error={error}
      ok={ok}
    />
  );
}
