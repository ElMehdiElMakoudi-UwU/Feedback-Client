"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const sectionSchema = z.object({
  nameAr: z.string().trim().min(1).max(100),
  nameFr: z.string().trim().min(1).max(100),
});

const categorySchema = z.object({
  sectionId: z.string().min(1),
  nameAr: z.string().trim().min(1).max(100),
  nameFr: z.string().trim().min(1).max(100),
});

const itemSchema = z.object({
  categoryId: z.string().min(1),
  nameAr: z.string().trim().min(1).max(150),
  nameFr: z.string().trim().min(1).max(150),
  descriptionAr: z.string().trim().max(500).optional(),
  descriptionFr: z.string().trim().max(500).optional(),
  noteAr: z.string().trim().max(100).optional(),
  noteFr: z.string().trim().max(100).optional(),
  price: z.coerce.number().min(0).max(100000).optional(),
  priceLarge: z.coerce.number().min(0).max(100000).optional(),
  comingSoon: z.coerce.boolean().optional(),
  photoUrl: z.string().trim().url().max(2000).optional(),
});

const photoSchema = z.object({
  id: z.string().min(1),
  photoUrl: z.union([z.string().trim().url().max(2000), z.literal("")]),
});

function extractImageUrl(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/<img[^>]*\bsrc=["']([^"']+)["']/i);
  return match ? match[1] : trimmed;
}

function revalidateMenu() {
  revalidatePath("/admin/menu");
  revalidatePath("/menu");
}

export async function createSection(formData: FormData) {
  await requireAdmin();
  const parsed = sectionSchema.safeParse({
    nameAr: formData.get("nameAr"),
    nameFr: formData.get("nameFr"),
  });
  if (!parsed.success) return;

  const count = await prisma.menuSection.count();
  await prisma.menuSection.create({
    data: { ...parsed.data, sortOrder: count },
  });
  revalidateMenu();
}

export async function deleteSection(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.menuSection.delete({ where: { id } });
  revalidateMenu();
}

export async function createCategory(formData: FormData) {
  await requireAdmin();
  const parsed = categorySchema.safeParse({
    sectionId: formData.get("sectionId"),
    nameAr: formData.get("nameAr"),
    nameFr: formData.get("nameFr"),
  });
  if (!parsed.success) return;

  const count = await prisma.menuCategory.count({
    where: { sectionId: parsed.data.sectionId },
  });
  await prisma.menuCategory.create({
    data: { ...parsed.data, sortOrder: count },
  });
  revalidateMenu();
}

export async function deleteCategory(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.menuCategory.delete({ where: { id } });
  revalidateMenu();
}

export async function createItem(formData: FormData) {
  await requireAdmin();
  const parsed = itemSchema.safeParse({
    categoryId: formData.get("categoryId"),
    nameAr: formData.get("nameAr"),
    nameFr: formData.get("nameFr"),
    descriptionAr: formData.get("descriptionAr") || undefined,
    descriptionFr: formData.get("descriptionFr") || undefined,
    noteAr: formData.get("noteAr") || undefined,
    noteFr: formData.get("noteFr") || undefined,
    price: formData.get("price") || undefined,
    priceLarge: formData.get("priceLarge") || undefined,
    comingSoon: formData.get("comingSoon") === "on" || undefined,
    photoUrl: formData.get("photoUrl")
      ? extractImageUrl(String(formData.get("photoUrl")))
      : undefined,
  });
  if (!parsed.success) return;

  const count = await prisma.menuItem.count({
    where: { categoryId: parsed.data.categoryId },
  });
  await prisma.menuItem.create({
    data: {
      categoryId: parsed.data.categoryId,
      nameAr: parsed.data.nameAr,
      nameFr: parsed.data.nameFr,
      descriptionAr: parsed.data.descriptionAr || null,
      descriptionFr: parsed.data.descriptionFr || null,
      noteAr: parsed.data.noteAr || null,
      noteFr: parsed.data.noteFr || null,
      price: parsed.data.comingSoon ? null : parsed.data.price ?? null,
      priceLarge: parsed.data.priceLarge ?? null,
      comingSoon: parsed.data.comingSoon ?? false,
      photoUrl: parsed.data.photoUrl || null,
      sortOrder: count,
    },
  });
  revalidateMenu();
}

export async function updateItemPhoto(formData: FormData) {
  await requireAdmin();
  const parsed = photoSchema.safeParse({
    id: formData.get("id"),
    photoUrl: extractImageUrl(String(formData.get("photoUrl") ?? "")),
  });
  if (!parsed.success) return;
  await prisma.menuItem.update({
    where: { id: parsed.data.id },
    data: { photoUrl: parsed.data.photoUrl || null },
  });
  revalidateMenu();
}

export async function toggleItemAvailability(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const available = formData.get("available") === "true";
  if (!id) return;
  await prisma.menuItem.update({
    where: { id },
    data: { available: !available },
  });
  revalidateMenu();
}

export async function deleteItem(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.menuItem.delete({ where: { id } });
  revalidateMenu();
}
