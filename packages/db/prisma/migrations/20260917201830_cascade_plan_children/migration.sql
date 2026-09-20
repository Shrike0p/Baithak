-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_planId_fkey";

-- DropForeignKey
ALTER TABLE "PlanAttendee" DROP CONSTRAINT "PlanAttendee_planId_fkey";

-- AddForeignKey
ALTER TABLE "PlanAttendee" ADD CONSTRAINT "PlanAttendee_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
