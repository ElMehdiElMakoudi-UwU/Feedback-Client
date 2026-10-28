-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER,
    "tableNumber" TEXT NOT NULL,
    "guestName" TEXT,
    "deliveryAddress" TEXT,
    "source" TEXT NOT NULL DEFAULT 'WEB',
    "trackingCode" TEXT,
    "contactPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "readyAt" DATETIME,
    "completedAt" DATETIME,
    "rushedAt" DATETIME,
    "note" TEXT,
    "total" REAL NOT NULL,
    "customerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("completedAt", "createdAt", "customerId", "deliveryAddress", "guestName", "id", "note", "number", "readyAt", "rushedAt", "status", "tableNumber", "total", "updatedAt") SELECT "completedAt", "createdAt", "customerId", "deliveryAddress", "guestName", "id", "note", "number", "readyAt", "rushedAt", "status", "tableNumber", "total", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_trackingCode_key" ON "Order"("trackingCode");
CREATE INDEX "Order_status_idx" ON "Order"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
