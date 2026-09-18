"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

function redirectToSettings(params: Record<string, string> = {}): never {
  const query = new URLSearchParams(params);
  const suffix = query.toString();
  redirect(`/admin/loyalty/settings${suffix ? `?${suffix}` : ""}`);
}

const offerSchema = z.object({
  titleAr: z.string().trim().min(1).max(120),
  titleFr: z.string().trim().min(1).max(120),
  pointsCost: z.coerce.number().int().min(1).max(1_000_000),
});

export async function createLoyaltyOffer(formData: FormData) {
  await requireAdmin();

  const parsed = offerSchema.safeParse({
    titleAr: formData.get("titleAr"),
    titleFr: formData.get("titleFr"),
    pointsCost: formData.get("pointsCost"),
  });
  if (!parsed.success) redirectToSettings({ error: "invalid" });

  const { titleAr, titleFr, pointsCost } = parsed.data;
  const last = await prisma.loyaltyOffer.findFirst({
    orderBy: { sortOrder: "desc" },
  });

  await prisma.loyaltyOffer.create({
    data: {
      titleAr,
      titleFr,
      pointsCost,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });

  revalidatePath("/admin/loyalty/settings");
  redirectToSettings({ ok: "created" });
}

const toggleSchema = z.object({
  id: z.string().min(1),
  active: z.coerce.boolean(),
});

export async function toggleLoyaltyOffer(formData: FormData) {
  await requireAdmin();

  const parsed = toggleSchema.safeParse({
    id: formData.get("id"),
    active: formData.get("active"),
  });
  if (!parsed.success) redirectToSettings({ error: "invalid" });

  const { id, active } = parsed.data;
  await prisma.loyaltyOffer.update({ where: { id }, data: { active } });

  revalidatePath("/admin/loyalty/settings");
  redirectToSettings();
}

export async function deleteLoyaltyOffer(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") || "");
  if (!id) redirectToSettings({ error: "invalid" });

  await prisma.loyaltyOffer.delete({ where: { id } });

  revalidatePath("/admin/loyalty/settings");
  redirectToSettings({ ok: "deleted" });
}
