import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

type ItemInput = {
  nameAr: string;
  nameFr: string;
  descriptionAr?: string | null;
  descriptionFr?: string | null;
  noteAr?: string | null;
  noteFr?: string | null;
  price?: number | null;
  priceLarge?: number | null;
  comingSoon?: boolean;
  sortOrder: number;
};

type CategoryInput = {
  nameAr: string;
  nameFr: string;
  sortOrder: number;
  items: ItemInput[];
};

type SectionInput = {
  nameAr: string;
  nameFr: string;
  sortOrder: number;
  categories: CategoryInput[];
};

async function main() {
  const file = join(__dirname, "menu-export.json");
  const sections: SectionInput[] = JSON.parse(readFileSync(file, "utf-8"));

  // Only touches menu tables — admin users, feedback, loyalty/points data are untouched.
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.menuSection.deleteMany();

  for (const section of sections) {
    const createdSection = await prisma.menuSection.create({
      data: {
        nameAr: section.nameAr,
        nameFr: section.nameFr,
        sortOrder: section.sortOrder,
      },
    });

    for (const category of section.categories) {
      const createdCategory = await prisma.menuCategory.create({
        data: {
          sectionId: createdSection.id,
          nameAr: category.nameAr,
          nameFr: category.nameFr,
          sortOrder: category.sortOrder,
        },
      });

      for (const item of category.items) {
        await prisma.menuItem.create({
          data: {
            categoryId: createdCategory.id,
            nameAr: item.nameAr,
            nameFr: item.nameFr,
            descriptionAr: item.descriptionAr,
            descriptionFr: item.descriptionFr,
            noteAr: item.noteAr,
            noteFr: item.noteFr,
            price: item.price,
            priceLarge: item.priceLarge,
            comingSoon: item.comingSoon ?? false,
            sortOrder: item.sortOrder,
          },
        });
      }
    }
  }

  console.log(`Menu imported: ${sections.length} sections`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
