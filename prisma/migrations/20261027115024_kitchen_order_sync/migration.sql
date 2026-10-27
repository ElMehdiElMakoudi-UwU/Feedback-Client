-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "holdUntil" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Workstation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kitchenId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "targetMinutes" INTEGER NOT NULL DEFAULT 12,
    "staffCount" INTEGER NOT NULL DEFAULT 1,
    "syncWithOrder" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Workstation_kitchenId_fkey" FOREIGN KEY ("kitchenId") REFERENCES "Kitchen" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Workstation" ("createdAt", "id", "kitchenId", "name", "sortOrder", "staffCount", "targetMinutes") SELECT "createdAt", "id", "kitchenId", "name", "sortOrder", "staffCount", "targetMinutes" FROM "Workstation";
DROP TABLE "Workstation";
ALTER TABLE "new_Workstation" RENAME TO "Workstation";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
