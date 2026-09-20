-- CreateEnum
CREATE TYPE "AttendAgain" AS ENUM ('YES', 'MAYBE', 'NO');

-- CreateEnum
CREATE TYPE "ConnectionSource" AS ENUM ('MUTUAL_HANGOUT_AGAIN', 'SAME_PLAN', 'MANUAL');

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "hostRating" INTEGER NOT NULL,
    "crowdRating" INTEGER NOT NULL,
    "vibeRating" INTEGER NOT NULL,
    "safetyRating" INTEGER NOT NULL,
    "attendAgain" "AttendAgain" NOT NULL,
    "privateNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HangoutAgain" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,

    CONSTRAINT "HangoutAgain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Connection" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "source" "ConnectionSource" NOT NULL DEFAULT 'MUTUAL_HANGOUT_AGAIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_planId_idx" ON "Review"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_planId_reviewerId_key" ON "Review"("planId", "reviewerId");

-- CreateIndex
CREATE INDEX "HangoutAgain_targetUserId_idx" ON "HangoutAgain"("targetUserId");

-- CreateIndex
CREATE UNIQUE INDEX "HangoutAgain_reviewId_targetUserId_key" ON "HangoutAgain"("reviewId", "targetUserId");

-- CreateIndex
CREATE INDEX "Connection_userBId_idx" ON "Connection"("userBId");

-- CreateIndex
CREATE UNIQUE INDEX "Connection_userAId_userBId_key" ON "Connection"("userAId", "userBId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangoutAgain" ADD CONSTRAINT "HangoutAgain_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangoutAgain" ADD CONSTRAINT "HangoutAgain_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
