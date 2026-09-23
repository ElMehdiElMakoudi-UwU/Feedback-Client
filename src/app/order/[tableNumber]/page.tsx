import { prisma } from "@/lib/prisma";
import type { MenuSectionView } from "@/app/menu/types";
import { OrderBuilder } from "./order-builder";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ tableNumber: string }>;
  searchParams: Promise<{ phone?: string; address?: string; addToOrder?: string }>;
}) {
  const { tableNumber } = await params;
  const { phone, address, addToOrder } = await searchParams;

  const sections = await prisma.menuSection.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      categories: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            where: { available: true, comingSoon: false },
            orderBy: { sortOrder: "asc" },
            include: {
              optionGroups: {
                orderBy: { sortOrder: "asc" },
                include: {
                  options: {
                    where: { available: true },
                    orderBy: { sortOrder: "asc" },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const data: MenuSectionView[] = sections.map((section) => ({
    id: section.id,
    nameAr: section.nameAr,
    nameFr: section.nameFr,
    categories: section.categories.map((category) => ({
      id: category.id,
      nameAr: category.nameAr,
      nameFr: category.nameFr,
      items: category.items.map((item) => ({
        id: item.id,
        nameAr: item.nameAr,
        nameFr: item.nameFr,
        descriptionAr: item.descriptionAr,
        descriptionFr: item.descriptionFr,
        noteAr: item.noteAr,
        noteFr: item.noteFr,
        price: item.price,
        priceLarge: item.priceLarge,
        comingSoon: item.comingSoon,
        photoUrl: item.photoUrl,
        optionGroups: item.optionGroups
          .filter((group) => group.options.length > 0)
          .map((group) => ({
            id: group.id,
            nameAr: group.nameAr,
            nameFr: group.nameFr,
            required: group.required,
            maxSelect: group.maxSelect,
            options: group.options.map((option) => ({
              id: option.id,
              nameAr: option.nameAr,
              nameFr: option.nameFr,
              priceDelta: option.priceDelta,
            })),
          })),
      })),
    })),
  }));

  return (
    <OrderBuilder
      tableNumber={tableNumber}
      sections={data}
      initialPhone={phone ?? ""}
      initialAddress={address ?? ""}
      addToOrderId={addToOrder}
    />
  );
}
