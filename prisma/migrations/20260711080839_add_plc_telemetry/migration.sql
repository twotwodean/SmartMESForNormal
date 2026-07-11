-- CreateTable
CREATE TABLE "EquipmentState" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "runState" TEXT NOT NULL DEFAULT 'STOP',
    "stopReason" TEXT,
    "goodCount" INTEGER NOT NULL DEFAULT 0,
    "defectCount" INTEGER NOT NULL DEFAULT 0,
    "cycleTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "temperature" DOUBLE PRECISION,
    "pressure" DOUBLE PRECISION,
    "spindleRpm" INTEGER,
    "loadPct" INTEGER,
    "online" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlcReading" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "signal" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlcReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentState_equipmentId_key" ON "EquipmentState"("equipmentId");

-- CreateIndex
CREATE INDEX "PlcReading_equipmentId_ts_idx" ON "PlcReading"("equipmentId", "ts");

-- AddForeignKey
ALTER TABLE "EquipmentState" ADD CONSTRAINT "EquipmentState_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlcReading" ADD CONSTRAINT "PlcReading_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
