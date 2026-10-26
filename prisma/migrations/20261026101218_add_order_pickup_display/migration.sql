-- AlterTable
ALTER TABLE "Order" ADD COLUMN "number" INTEGER;
ALTER TABLE "Order" ADD COLUMN "readyAt" DATETIME;

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");
