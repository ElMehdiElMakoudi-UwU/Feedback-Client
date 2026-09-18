-- CreateTable
CREATE TABLE "Kitchen" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Workstation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kitchenId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Workstation_kitchenId_fkey" FOREIGN KEY ("kitchenId") REFERENCES "Kitchen" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WorkstationIngredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workstationId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "currentQuantity" REAL NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "WorkstationIngredient_workstationId_fkey" FOREIGN KEY ("workstationId") REFERENCES "Workstation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkstationIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockRestock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workstationIngredientId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockRestock_workstationIngredientId_fkey" FOREIGN KEY ("workstationIngredientId") REFERENCES "WorkstationIngredient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockRestock_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecipeItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "menuItemId" TEXT NOT NULL,
    "size" TEXT,
    "ingredientId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    CONSTRAINT "RecipeItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecipeItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailySales" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailySales_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailySalesItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dailySalesId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "size" TEXT,
    "quantitySold" INTEGER NOT NULL,
    CONSTRAINT "DailySalesItem_dailySalesId_fkey" FOREIGN KEY ("dailySalesId") REFERENCES "DailySales" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DailySalesItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockCount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workstationId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "workerId" TEXT NOT NULL,
    "finalizedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockCount_workstationId_fkey" FOREIGN KEY ("workstationId") REFERENCES "Workstation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockCount_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "AdminUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockCountEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stockCountId" TEXT NOT NULL,
    "workstationIngredientId" TEXT NOT NULL,
    "actualQuantity" REAL NOT NULL,
    "expectedQuantity" REAL,
    "variance" REAL,
    CONSTRAINT "StockCountEntry_stockCountId_fkey" FOREIGN KEY ("stockCountId") REFERENCES "StockCount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockCountEntry_workstationIngredientId_fkey" FOREIGN KEY ("workstationIngredientId") REFERENCES "WorkstationIngredient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "workstationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminUser_workstationId_fkey" FOREIGN KEY ("workstationId") REFERENCES "Workstation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AdminUser" ("createdAt", "email", "id", "passwordHash", "role") SELECT "createdAt", "email", "id", "passwordHash", "role" FROM "AdminUser";
DROP TABLE "AdminUser";
ALTER TABLE "new_AdminUser" RENAME TO "AdminUser";
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");
CREATE TABLE "new_MenuItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "descriptionFr" TEXT,
    "noteAr" TEXT,
    "noteFr" TEXT,
    "price" REAL,
    "priceLarge" REAL,
    "comingSoon" BOOLEAN NOT NULL DEFAULT false,
    "photoUrl" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "workstationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MenuCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuItem_workstationId_fkey" FOREIGN KEY ("workstationId") REFERENCES "Workstation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MenuItem" ("available", "categoryId", "comingSoon", "createdAt", "descriptionAr", "descriptionFr", "id", "nameAr", "nameFr", "noteAr", "noteFr", "photoUrl", "price", "priceLarge", "sortOrder", "updatedAt") SELECT "available", "categoryId", "comingSoon", "createdAt", "descriptionAr", "descriptionFr", "id", "nameAr", "nameFr", "noteAr", "noteFr", "photoUrl", "price", "priceLarge", "sortOrder", "updatedAt" FROM "MenuItem";
DROP TABLE "MenuItem";
ALTER TABLE "new_MenuItem" RENAME TO "MenuItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "WorkstationIngredient_workstationId_ingredientId_key" ON "WorkstationIngredient"("workstationId", "ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeItem_menuItemId_size_ingredientId_key" ON "RecipeItem"("menuItemId", "size", "ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "DailySales_date_key" ON "DailySales"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailySalesItem_dailySalesId_menuItemId_size_key" ON "DailySalesItem"("dailySalesId", "menuItemId", "size");

-- CreateIndex
CREATE UNIQUE INDEX "StockCount_workstationId_date_key" ON "StockCount"("workstationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StockCountEntry_stockCountId_workstationIngredientId_key" ON "StockCountEntry"("stockCountId", "workstationIngredientId");
