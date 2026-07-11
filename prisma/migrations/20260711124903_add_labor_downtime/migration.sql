-- AlterTable
ALTER TABLE "ProductionResult" ADD COLUMN     "downtimeReasonId" TEXT,
ADD COLUMN     "operatorId" TEXT,
ADD COLUMN     "shiftId" TEXT;

-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DowntimeReason" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'UNPLANNED',

    CONSTRAINT "DowntimeReason_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Operator_code_key" ON "Operator"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Shift_code_key" ON "Shift"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DowntimeReason_code_key" ON "DowntimeReason"("code");

-- CreateIndex
CREATE INDEX "ProductionResult_operatorId_idx" ON "ProductionResult"("operatorId");

-- CreateIndex
CREATE INDEX "ProductionResult_shiftId_idx" ON "ProductionResult"("shiftId");

-- CreateIndex
CREATE INDEX "ProductionResult_downtimeReasonId_idx" ON "ProductionResult"("downtimeReasonId");

-- AddForeignKey
ALTER TABLE "ProductionResult" ADD CONSTRAINT "ProductionResult_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionResult" ADD CONSTRAINT "ProductionResult_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionResult" ADD CONSTRAINT "ProductionResult_downtimeReasonId_fkey" FOREIGN KEY ("downtimeReasonId") REFERENCES "DowntimeReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;
