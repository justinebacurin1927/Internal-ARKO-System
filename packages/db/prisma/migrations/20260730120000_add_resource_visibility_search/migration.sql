-- Visibility flags (default public so existing resources become shared)
ALTER TABLE "Resource" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ResourceCategory" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true;

-- Structural indexes for filtering + pagination ordering
CREATE INDEX "Resource_categoryId_idx" ON "Resource"("categoryId");
CREATE INDEX "Resource_userId_idx" ON "Resource"("userId");
CREATE INDEX "Resource_isPublic_idx" ON "Resource"("isPublic");
CREATE INDEX "Resource_updatedAt_idx" ON "Resource"("updatedAt");
CREATE INDEX "ResourceCategory_isPublic_idx" ON "ResourceCategory"("isPublic");

-- Tag search indexing (array containment) — no extension required
CREATE INDEX "Resource_tags_idx" ON "Resource" USING gin ("tags");
