-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "KioskDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "revokedAt" DATETIME,
    "lastSeenAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "clockInAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clockInPhotoUrl" TEXT NOT NULL,
    "clockInDeviceId" TEXT,
    "clockOutAt" DATETIME,
    "clockOutPhotoUrl" TEXT,
    "clockOutDeviceId" TEXT,
    "editedById" TEXT,
    "editedAt" DATETIME,
    "editNote" TEXT,
    CONSTRAINT "Shift_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Shift_clockInDeviceId_fkey" FOREIGN KEY ("clockInDeviceId") REFERENCES "KioskDevice" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Shift_clockOutDeviceId_fkey" FOREIGN KEY ("clockOutDeviceId") REFERENCES "KioskDevice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "KioskDevice_tokenHash_key" ON "KioskDevice"("tokenHash");

-- CreateIndex
CREATE INDEX "Shift_employeeId_clockOutAt_idx" ON "Shift"("employeeId", "clockOutAt");

-- CreateIndex
CREATE INDEX "Shift_clockInAt_idx" ON "Shift"("clockInAt");
