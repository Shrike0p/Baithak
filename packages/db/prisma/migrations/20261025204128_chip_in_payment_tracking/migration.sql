-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationKind" ADD VALUE 'GUEST_REMOVED';
ALTER TYPE "NotificationKind" ADD VALUE 'PAYMENT_CLAIMED';

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "paidClaimedAt" TIMESTAMP(3),
ADD COLUMN     "paidConfirmedAt" TIMESTAMP(3);
