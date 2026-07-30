-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "categoryId" TEXT;

-- CreateTable
CREATE TABLE "ResourceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Folder',
    "userId" TEXT NOT NULL,

    CONSTRAINT "ResourceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResourceCategory_name_userId_key" ON "ResourceCategory"("name", "userId");

-- AddForeignKey
ALTER TABLE "ResourceCategory" ADD CONSTRAINT "ResourceCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ResourceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
