CREATE INDEX "ConversationParticipant_userId_lastReadAt_idx"
ON "ConversationParticipant"("userId", "lastReadAt");

CREATE INDEX "Message_conversationId_createdAt_idx"
ON "Message"("conversationId", "createdAt");

CREATE INDEX "Message_senderId_createdAt_idx"
ON "Message"("senderId", "createdAt");
