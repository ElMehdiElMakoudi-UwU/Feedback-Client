-- AlterTable
ALTER TABLE "Order" ADD COLUMN "completedAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "rushedAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT,
    "nameAr" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "size" TEXT,
    "optionsAr" TEXT,
    "optionsFr" TEXT,
    "unitPrice" REAL NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "confirmed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workstationId" TEXT,
    "firedAt" DATETIME,
    "startedAt" DATETIME,
    "doneAt" DATETIME,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_workstationId_fkey" FOREIGN KEY ("workstationId") REFERENCES "Workstation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OrderItem" ("confirmed", "createdAt", "id", "menuItemId", "nameAr", "nameFr", "optionsAr", "optionsFr", "orderId", "quantity", "size", "unitPrice") SELECT "confirmed", "createdAt", "id", "menuItemId", "nameAr", "nameFr", "optionsAr", "optionsFr", "orderId", "quantity", "size", "unitPrice" FROM "OrderItem";
DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";
CREATE INDEX "OrderItem_workstationId_doneAt_idx" ON "OrderItem"("workstationId", "doneAt");
CREATE TABLE "new_Workstation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kitchenId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "targetMinutes" INTEGER NOT NULL DEFAULT 12,
    "staffCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Workstation_kitchenId_fkey" FOREIGN KEY ("kitchenId") REFERENCES "Kitchen" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Workstation" ("createdAt", "id", "kitchenId", "name", "sortOrder") SELECT "createdAt", "id", "kitchenId", "name", "sortOrder" FROM "Workstation";
DROP TABLE "Workstation";
ALTER TABLE "new_Workstation" RENAME TO "Workstation";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Orders already in the kitchen when this ships: fire their confirmed items
-- to the poste their menu item is routed to, so they show up on the screens.
UPDATE "OrderItem"
SET "firedAt" = "createdAt",
    "workstationId" = (SELECT "workstationId" FROM "MenuItem" WHERE "MenuItem"."id" = "OrderItem"."menuItemId")
WHERE "confirmed" = true
  AND "orderId" IN (SELECT "id" FROM "Order" WHERE "status" IN ('CONFIRMED', 'PREPARING', 'READY'));

UPDATE "Order" SET "completedAt" = "updatedAt" WHERE "status" = 'COMPLETED';
