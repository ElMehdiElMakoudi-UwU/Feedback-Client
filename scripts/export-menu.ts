import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();

async function main() {
  const sections = await prisma.menuSection.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      categories: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
            include: {
              optionGroups: {
                orderBy: { sortOrder: "asc" },
                include: { options: { orderBy: { sortOrder: "asc" } } },
              },
            },
          },
        },
      },
    },
  });
  writeFileSync("scripts/menu-export.json", JSON.stringify(sections, null, 2));
  console.log(`Exported ${sections.length} sections`);
}

main().finally(() => prisma.$disconnect());
