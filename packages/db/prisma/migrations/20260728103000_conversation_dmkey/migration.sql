-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "dmKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_dmKey_key" ON "Conversation"("dmKey");
