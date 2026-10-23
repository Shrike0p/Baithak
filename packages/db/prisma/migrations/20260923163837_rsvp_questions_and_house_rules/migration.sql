-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "agreedAt" TIMESTAMP(3),
ADD COLUMN     "answers" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "houseRules" TEXT,
ADD COLUMN     "rsvpQuestions" TEXT[] DEFAULT ARRAY[]::TEXT[];
