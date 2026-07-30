ALTER TABLE "AccountCategory" ADD COLUMN "userId" TEXT;

CREATE INDEX "AccountCategory_userId_idx" ON "AccountCategory"("userId");

CREATE UNIQUE INDEX "AccountCategory_userId_name_type_key"
ON "AccountCategory"("userId", "name", "type");

ALTER TABLE "AccountCategory"
ADD CONSTRAINT "AccountCategory_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
