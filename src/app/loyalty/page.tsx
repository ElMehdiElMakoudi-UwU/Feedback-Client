import { prisma } from "@/lib/prisma";
import { LoyaltyLookup } from "./loyalty-lookup";

export const dynamic = "force-dynamic";

export default async function CustomerLoyaltyPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const { phone } = await searchParams;
  const trimmedPhone = phone?.trim() || "";

  const customer = trimmedPhone
    ? await prisma.customer.findUnique({
        where: { phone: trimmedPhone },
        select: {
          points: true,
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 30,
            select: {
              id: true,
              points: true,
              orderTotal: true,
              note: true,
              createdAt: true,
            },
          },
        },
      })
    : null;

  return <LoyaltyLookup phone={trimmedPhone} customer={customer} />;
}
