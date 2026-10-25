-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "askPhone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "upiId" TEXT;
