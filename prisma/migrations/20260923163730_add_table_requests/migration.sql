-- CreateTable
CREATE TABLE "TableRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tableNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "TableRequest_status_tableNumber_idx" ON "TableRequest"("status", "tableNumber");
