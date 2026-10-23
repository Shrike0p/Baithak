-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "requiredOfGuests" TEXT[] DEFAULT ARRAY[]::TEXT[];
