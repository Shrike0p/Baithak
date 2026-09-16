-- CreateEnum
CREATE TYPE "PlanCategory" AS ENUM ('HOUSE_PARTY', 'DRINKS', 'DINNER', 'GAME_NIGHT', 'MOVIE', 'SPORTS', 'TRIP', 'OTHER');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'OPEN', 'FULL', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendeeRole" AS ENUM ('HOST', 'GUEST');

-- CreateEnum
CREATE TYPE "AttendeeStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'PASSED', 'REVIEW_LATER');

-- CreateEnum
CREATE TYPE "BringingWith" AS ENUM ('SOLO', 'ONE_FRIEND', 'GROUP');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "city" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "PlanCategory" NOT NULL,
    "vibeTags" TEXT[],
    "neighborhood" TEXT NOT NULL,
    "exactAddress" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanAttendee" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AttendeeRole" NOT NULL,
    "status" "AttendeeStatus" NOT NULL DEFAULT 'CONFIRMED',
    "firstTime" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "bringingWith" "BringingWith" NOT NULL,
    "note" TEXT,
    "matchScore" DOUBLE PRECISION,
    "matchReasons" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanAttendee_planId_userId_key" ON "PlanAttendee"("planId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_planId_applicantId_key" ON "Application"("planId", "applicantId");

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanAttendee" ADD CONSTRAINT "PlanAttendee_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanAttendee" ADD CONSTRAINT "PlanAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
