import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/require-admin";
import { LoyaltyView } from "./loyalty-view";

export const dynamic = "force-dynamic";

export default async function LoyaltyPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; error?: string; ok?: string }>;
}) {
  const staff = await requireStaff();
  const { phone, error, ok } = await searchParams;
  const trimmedPhone = phone?.trim() || "";

  const [customer, topCustomers] = await Promise.all([
    trimmedPhone
      ? prisma.customer.findUnique({
          where: { phone: trimmedPhone },
          include: {
            transactions: {
              orderBy: { createdAt: "desc" },
              take: 15,
            },
          },
        })
      : Promise.resolve(null),
    prisma.customer.findMany({
      where: { points: { gt: 0 } },
      orderBy: { points: "desc" },
      take: 10,
      select: { id: true, phone: true, points: true },
    }),
  ]);

  return (
    <LoyaltyView
      role={staff.role}
      phone={trimmedPhone}
      customer={customer}
      topCustomers={topCustomers}
      error={error}
      ok={ok}
    />
  );
}
