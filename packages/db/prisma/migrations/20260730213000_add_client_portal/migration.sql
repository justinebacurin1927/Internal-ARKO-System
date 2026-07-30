CREATE TABLE "ClientProject" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "summary" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PLANNING',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "startDate" TIMESTAMP(3),
  "dueDate" TIMESTAMP(3),
  "clientId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientUpdate" (
  "id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientUpdate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientRequest" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "clientId" TEXT NOT NULL,
  "projectId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientProject_clientId_idx" ON "ClientProject"("clientId");
CREATE INDEX "ClientProject_ownerId_idx" ON "ClientProject"("ownerId");
CREATE INDEX "ClientProject_status_idx" ON "ClientProject"("status");
CREATE INDEX "ClientUpdate_projectId_createdAt_idx" ON "ClientUpdate"("projectId", "createdAt");
CREATE INDEX "ClientRequest_clientId_status_idx" ON "ClientRequest"("clientId", "status");
CREATE INDEX "ClientRequest_projectId_idx" ON "ClientRequest"("projectId");

ALTER TABLE "ClientProject" ADD CONSTRAINT "ClientProject_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientProject" ADD CONSTRAINT "ClientProject_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientUpdate" ADD CONSTRAINT "ClientUpdate_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientUpdate" ADD CONSTRAINT "ClientUpdate_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientRequest" ADD CONSTRAINT "ClientRequest_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientRequest" ADD CONSTRAINT "ClientRequest_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
