-- AlterTable
ALTER TABLE "EquipmentState" ADD COLUMN     "lastFlushAt" TIMESTAMP(3),
ADD COLUMN     "pendingDefect" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pendingGood" INTEGER NOT NULL DEFAULT 0;
