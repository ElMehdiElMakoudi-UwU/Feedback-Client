-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tableNumber" TEXT NOT NULL,
    "foodRating" INTEGER NOT NULL,
    "serviceRating" INTEGER NOT NULL,
    "comment" TEXT,
    "enteredDraw" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "weekKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recoveryStatus" TEXT,
    "managerRequested" BOOLEAN NOT NULL DEFAULT false,
    "contactConsent" BOOLEAN NOT NULL DEFAULT false,
    "rootCause" TEXT,
    "recoveryNote" TEXT,
    "handledById" TEXT,
    "handledAt" DATETIME,
    CONSTRAINT "Feedback_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Feedback" ("comment", "createdAt", "enteredDraw", "foodRating", "id", "phone", "serviceRating", "tableNumber", "weekKey") SELECT "comment", "createdAt", "enteredDraw", "foodRating", "id", "phone", "serviceRating", "tableNumber", "weekKey" FROM "Feedback";
DROP TABLE "Feedback";
ALTER TABLE "new_Feedback" RENAME TO "Feedback";
CREATE INDEX "Feedback_recoveryStatus_idx" ON "Feedback"("recoveryStatus");
CREATE TABLE "new_TableRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tableNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "feedbackId" TEXT,
    CONSTRAINT "TableRequest_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TableRequest" ("createdAt", "id", "paymentMethod", "resolvedAt", "status", "tableNumber", "type") SELECT "createdAt", "id", "paymentMethod", "resolvedAt", "status", "tableNumber", "type" FROM "TableRequest";
DROP TABLE "TableRequest";
ALTER TABLE "new_TableRequest" RENAME TO "TableRequest";
CREATE UNIQUE INDEX "TableRequest_feedbackId_key" ON "TableRequest"("feedbackId");
CREATE INDEX "TableRequest_status_tableNumber_idx" ON "TableRequest"("status", "tableNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
