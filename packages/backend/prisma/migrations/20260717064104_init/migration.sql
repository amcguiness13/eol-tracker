-- CreateTable
CREATE TABLE "StackItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product" TEXT NOT NULL,
    "cycle" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'unspecified',
    "owner" TEXT,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Threshold" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stackItemId" TEXT,
    "days" INTEGER NOT NULL,
    CONSTRAINT "Threshold_stackItemId_fkey" FOREIGN KEY ("stackItemId") REFERENCES "StackItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stackItemId" TEXT NOT NULL,
    "thresholdDays" INTEGER NOT NULL,
    "eolDate" DATETIME NOT NULL,
    "message" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'in-app',
    "status" TEXT NOT NULL DEFAULT 'unread',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_stackItemId_fkey" FOREIGN KEY ("stackItemId") REFERENCES "StackItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EolCache" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "payload" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "StackItem_product_cycle_environment_key" ON "StackItem"("product", "cycle", "environment");

-- CreateIndex
CREATE UNIQUE INDEX "Threshold_stackItemId_days_key" ON "Threshold"("stackItemId", "days");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_stackItemId_thresholdDays_eolDate_key" ON "Notification"("stackItemId", "thresholdDays", "eolDate");
