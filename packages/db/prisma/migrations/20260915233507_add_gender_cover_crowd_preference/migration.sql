-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('WOMAN', 'MAN', 'NON_BINARY', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "ConnectionPreference" AS ENUM ('FRIENDS_OF_FRIENDS', 'COMMUNITY', 'OPEN', 'INVITE_ONLY');

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gender" "Gender";

-- CreateTable
CREATE TABLE "CrowdPreference" (
    "planId" TEXT NOT NULL,
    "ageMin" INTEGER,
    "ageMax" INTEGER,
    "preferredVibes" TEXT[],
    "targetWomen" INTEGER,
    "targetMen" INTEGER,
    "targetCouples" INTEGER,
    "connectionPreference" "ConnectionPreference" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "CrowdPreference_pkey" PRIMARY KEY ("planId")
);

-- AddForeignKey
ALTER TABLE "CrowdPreference" ADD CONSTRAINT "CrowdPreference_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
