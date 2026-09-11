-- CreateTable
CREATE TABLE "DrawWinner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekKey" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "pickedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DrawWinner_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Feedback" ("comment", "createdAt", "foodRating", "id", "serviceRating", "tableNumber") SELECT "comment", "createdAt", "foodRating", "id", "serviceRating", "tableNumber" FROM "Feedback";
DROP TABLE "Feedback";
ALTER TABLE "new_Feedback" RENAME TO "Feedback";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "DrawWinner_weekKey_key" ON "DrawWinner"("weekKey");

-- CreateIndex
CREATE UNIQUE INDEX "DrawWinner_feedbackId_key" ON "DrawWinner"("feedbackId");
