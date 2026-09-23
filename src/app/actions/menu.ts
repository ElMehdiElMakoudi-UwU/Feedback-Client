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

const optionGroupSchema = z.object({
  nameAr: z.string().trim().min(1).max(100),
  nameFr: z.string().trim().min(1).max(100),
  required: z.boolean(),
  maxSelect: z.coerce.number().int().min(0).max(20),
});

const optionSchema = z.object({
  nameAr: z.string().trim().min(1).max(100),
  nameFr: z.string().trim().min(1).max(100),
  priceDelta: z.coerce.number().min(-100000).max(100000),
});

type Direction = "up" | "down";

// Returns the sibling ids in their new order, or null if the move is a no-op.
function moved(ids: string[], id: string, direction: Direction) {
  const index = ids.indexOf(id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= ids.length) return null;
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function readMove(formData: FormData) {
  const id = String(formData.get("id") || "");
  const direction = formData.get("direction") === "up" ? "up" : "down";
  return { id, direction } as const;
}

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

function parseItemForm(formData: FormData) {
  return itemSchema.safeParse({
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
}

function itemData(data: z.infer<typeof itemSchema>) {
  return {
    categoryId: data.categoryId,
    nameAr: data.nameAr,
    nameFr: data.nameFr,
    descriptionAr: data.descriptionAr || null,
    descriptionFr: data.descriptionFr || null,
    noteAr: data.noteAr || null,
    noteFr: data.noteFr || null,
    price: data.comingSoon ? null : data.price ?? null,
    priceLarge: data.priceLarge ?? null,
    comingSoon: data.comingSoon ?? false,
    photoUrl: data.photoUrl || null,
  };
}

export async function createItem(formData: FormData) {
  await requireAdmin();
  const parsed = parseItemForm(formData);
  if (!parsed.success) return;

  const count = await prisma.menuItem.count({
    where: { categoryId: parsed.data.categoryId },
  });
  await prisma.menuItem.create({
    data: { ...itemData(parsed.data), sortOrder: count },
  });
  revalidateMenu();
}

export async function updateItem(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const parsed = parseItemForm(formData);
  if (!id || !parsed.success) return;

  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) return;

  // Moving to another category puts the item at the end of that category.
  const sortOrder =
    existing.categoryId === parsed.data.categoryId
      ? existing.sortOrder
      : await prisma.menuItem.count({
          where: { categoryId: parsed.data.categoryId },
        });

  await prisma.menuItem.update({
    where: { id },
    data: { ...itemData(parsed.data), sortOrder },
  });
  revalidateMenu();
}

export async function duplicateItem(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;

  const item = await prisma.menuItem.findUnique({
    where: { id },
    include: { optionGroups: { include: { options: true } } },
  });
  if (!item) return;

  const siblings = await prisma.menuItem.findMany({
    where: { categoryId: item.categoryId },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });

  const copy = await prisma.menuItem.create({
    data: {
      categoryId: item.categoryId,
      nameAr: `${item.nameAr} (نسخة)`,
      nameFr: `${item.nameFr} (copie)`,
      descriptionAr: item.descriptionAr,
      descriptionFr: item.descriptionFr,
      noteAr: item.noteAr,
      noteFr: item.noteFr,
      price: item.price,
      priceLarge: item.priceLarge,
      comingSoon: item.comingSoon,
      photoUrl: item.photoUrl,
      // Hidden until the admin has adjusted it.
      available: false,
      workstationId: item.workstationId,
      optionGroups: {
        create: item.optionGroups.map((group) => ({
          nameAr: group.nameAr,
          nameFr: group.nameFr,
          required: group.required,
          maxSelect: group.maxSelect,
          sortOrder: group.sortOrder,
          options: {
            create: group.options.map((option) => ({
              nameAr: option.nameAr,
              nameFr: option.nameFr,
              priceDelta: option.priceDelta,
              available: option.available,
              sortOrder: option.sortOrder,
            })),
          },
        })),
      },
    },
  });

  // Place the copy right after the original.
  const ids = siblings.map((s) => s.id);
  ids.splice(ids.indexOf(item.id) + 1, 0, copy.id);
  await prisma.$transaction(
    ids.map((itemId, index) =>
      prisma.menuItem.update({ where: { id: itemId }, data: { sortOrder: index } })
    )
  );
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

export async function updateSection(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const parsed = sectionSchema.safeParse({
    nameAr: formData.get("nameAr"),
    nameFr: formData.get("nameFr"),
  });
  if (!id || !parsed.success) return;
  await prisma.menuSection.update({ where: { id }, data: parsed.data });
  revalidateMenu();
}

export async function moveSection(formData: FormData) {
  await requireAdmin();
  const { id, direction } = readMove(formData);
  const siblings = await prisma.menuSection.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  const ids = moved(siblings.map((s) => s.id), id, direction);
  if (!ids) return;
  await prisma.$transaction(
    ids.map((sectionId, index) =>
      prisma.menuSection.update({ where: { id: sectionId }, data: { sortOrder: index } })
    )
  );
  revalidateMenu();
}

export async function updateCategory(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const parsed = categorySchema.safeParse({
    sectionId: formData.get("sectionId"),
    nameAr: formData.get("nameAr"),
    nameFr: formData.get("nameFr"),
  });
  if (!id || !parsed.success) return;

  const existing = await prisma.menuCategory.findUnique({ where: { id } });
  if (!existing) return;
  const sortOrder =
    existing.sectionId === parsed.data.sectionId
      ? existing.sortOrder
      : await prisma.menuCategory.count({
          where: { sectionId: parsed.data.sectionId },
        });

  await prisma.menuCategory.update({
    where: { id },
    data: { ...parsed.data, sortOrder },
  });
  revalidateMenu();
}

export async function moveCategory(formData: FormData) {
  await requireAdmin();
  const { id, direction } = readMove(formData);
  const category = await prisma.menuCategory.findUnique({ where: { id } });
  if (!category) return;
  const siblings = await prisma.menuCategory.findMany({
    where: { sectionId: category.sectionId },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  const ids = moved(siblings.map((s) => s.id), id, direction);
  if (!ids) return;
  await prisma.$transaction(
    ids.map((categoryId, index) =>
      prisma.menuCategory.update({ where: { id: categoryId }, data: { sortOrder: index } })
    )
  );
  revalidateMenu();
}

export async function moveItem(formData: FormData) {
  await requireAdmin();
  const { id, direction } = readMove(formData);
  const item = await prisma.menuItem.findUnique({ where: { id } });
  if (!item) return;
  const siblings = await prisma.menuItem.findMany({
    where: { categoryId: item.categoryId },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  const ids = moved(siblings.map((s) => s.id), id, direction);
  if (!ids) return;
  await prisma.$transaction(
    ids.map((itemId, index) =>
      prisma.menuItem.update({ where: { id: itemId }, data: { sortOrder: index } })
    )
  );
  revalidateMenu();
}

function parseOptionGroupForm(formData: FormData) {
  return optionGroupSchema.safeParse({
    nameAr: formData.get("nameAr"),
    nameFr: formData.get("nameFr"),
    required: formData.get("required") === "on",
    maxSelect: formData.get("maxSelect") ?? 1,
  });
}

export async function createOptionGroup(formData: FormData) {
  await requireAdmin();
  const menuItemId = String(formData.get("menuItemId") || "");
  const parsed = parseOptionGroupForm(formData);
  if (!menuItemId || !parsed.success) return;
  const count = await prisma.menuOptionGroup.count({ where: { menuItemId } });
  await prisma.menuOptionGroup.create({
    data: { ...parsed.data, menuItemId, sortOrder: count },
  });
  revalidateMenu();
}

export async function updateOptionGroup(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const parsed = parseOptionGroupForm(formData);
  if (!id || !parsed.success) return;
  await prisma.menuOptionGroup.update({ where: { id }, data: parsed.data });
  revalidateMenu();
}

export async function deleteOptionGroup(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.menuOptionGroup.delete({ where: { id } });
  revalidateMenu();
}

export async function moveOptionGroup(formData: FormData) {
  await requireAdmin();
  const { id, direction } = readMove(formData);
  const group = await prisma.menuOptionGroup.findUnique({ where: { id } });
  if (!group) return;
  const siblings = await prisma.menuOptionGroup.findMany({
    where: { menuItemId: group.menuItemId },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  const ids = moved(siblings.map((s) => s.id), id, direction);
  if (!ids) return;
  await prisma.$transaction(
    ids.map((groupId, index) =>
      prisma.menuOptionGroup.update({ where: { id: groupId }, data: { sortOrder: index } })
    )
  );
  revalidateMenu();
}

function parseOptionForm(formData: FormData) {
  return optionSchema.safeParse({
    nameAr: formData.get("nameAr"),
    nameFr: formData.get("nameFr"),
    priceDelta: formData.get("priceDelta") || 0,
  });
}

export async function createOption(formData: FormData) {
  await requireAdmin();
  const groupId = String(formData.get("groupId") || "");
  const parsed = parseOptionForm(formData);
  if (!groupId || !parsed.success) return;
  const count = await prisma.menuOption.count({ where: { groupId } });
  await prisma.menuOption.create({
    data: { ...parsed.data, groupId, sortOrder: count },
  });
  revalidateMenu();
}

export async function updateOption(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const parsed = parseOptionForm(formData);
  if (!id || !parsed.success) return;
  await prisma.menuOption.update({ where: { id }, data: parsed.data });
  revalidateMenu();
}

export async function toggleOptionAvailability(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const available = formData.get("available") === "true";
  if (!id) return;
  await prisma.menuOption.update({
    where: { id },
    data: { available: !available },
  });
  revalidateMenu();
}

export async function deleteOption(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.menuOption.delete({ where: { id } });
  revalidateMenu();
}

export async function moveOption(formData: FormData) {
  await requireAdmin();
  const { id, direction } = readMove(formData);
  const option = await prisma.menuOption.findUnique({ where: { id } });
  if (!option) return;
  const siblings = await prisma.menuOption.findMany({
    where: { groupId: option.groupId },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  const ids = moved(siblings.map((s) => s.id), id, direction);
  if (!ids) return;
  await prisma.$transaction(
    ids.map((optionId, index) =>
      prisma.menuOption.update({ where: { id: optionId }, data: { sortOrder: index } })
    )
  );
  revalidateMenu();
}
