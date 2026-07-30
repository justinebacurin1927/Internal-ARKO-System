ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ACCOUNTANT';

ALTER TABLE "AccountCategory"
ADD COLUMN "scope" "TransactionScope" NOT NULL DEFAULT 'PERSONAL';

ALTER TABLE "RecurringTransaction"
ADD COLUMN "scope" "TransactionScope" NOT NULL DEFAULT 'PERSONAL';

ALTER TABLE "Budget"
ADD COLUMN "scope" "TransactionScope" NOT NULL DEFAULT 'PERSONAL',
ADD COLUMN "userId" TEXT;

UPDATE "Budget"
SET "userId" = COALESCE(
  (
    SELECT "userId"
    FROM "AccountCategory"
    WHERE "AccountCategory"."budgetId" = "Budget"."id"
      AND "AccountCategory"."userId" IS NOT NULL
    LIMIT 1
  ),
  (
    SELECT "id"
    FROM "User"
    WHERE "role" = 'ADMIN'
    ORDER BY "createdAt"
    LIMIT 1
  ),
  (
    SELECT "id"
    FROM "User"
    ORDER BY "createdAt"
    LIMIT 1
  )
)
WHERE "userId" IS NULL;

ALTER TABLE "Budget"
ALTER COLUMN "userId" SET NOT NULL;

CREATE INDEX "Budget_userId_scope_idx" ON "Budget"("userId", "scope");

ALTER TABLE "Budget"
ADD CONSTRAINT "Budget_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
