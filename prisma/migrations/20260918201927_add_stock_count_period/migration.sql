-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StockCount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workstationId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'CLOSING',
    "workerId" TEXT NOT NULL,
    "finalizedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockCount_workstationId_fkey" FOREIGN KEY ("workstationId") REFERENCES "Workstation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockCount_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "AdminUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_StockCount" ("createdAt", "date", "finalizedAt", "id", "workerId", "workstationId") SELECT "createdAt", "date", "finalizedAt", "id", "workerId", "workstationId" FROM "StockCount";
DROP TABLE "StockCount";
ALTER TABLE "new_StockCount" RENAME TO "StockCount";
CREATE UNIQUE INDEX "StockCount_workstationId_date_period_key" ON "StockCount"("workstationId", "date", "period");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
