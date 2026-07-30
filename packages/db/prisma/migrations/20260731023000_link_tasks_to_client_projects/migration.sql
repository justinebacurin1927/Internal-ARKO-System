ALTER TABLE "Task" ADD COLUMN "projectId" TEXT;

CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");

ALTER TABLE "Task"
ADD CONSTRAINT "Task_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
