CREATE INDEX "Transaction_userId_scope_date_idx"
ON "Transaction"("userId", "scope", "date");

CREATE INDEX "Transaction_scope_date_idx"
ON "Transaction"("scope", "date");

CREATE INDEX "Task_assigneeId_position_idx"
ON "Task"("assigneeId", "position");

CREATE INDEX "Task_parentId_idx"
ON "Task"("parentId");

CREATE INDEX "Reminder_userId_dueAt_idx"
ON "Reminder"("userId", "dueAt");

CREATE INDEX "Note_userId_updatedAt_idx"
ON "Note"("userId", "updatedAt");

CREATE INDEX "Event_userId_date_idx"
ON "Event"("userId", "date");

CREATE INDEX "Sprint_userId_startDate_idx"
ON "Sprint"("userId", "startDate");

CREATE INDEX "Idea_userId_createdAt_idx"
ON "Idea"("userId", "createdAt");

CREATE INDEX "JournalEntry_userId_date_idx"
ON "JournalEntry"("userId", "date");
