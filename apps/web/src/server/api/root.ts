import { router } from './trpc'
import { financeRouter } from './routers/finance'
import { tasksRouter } from './routers/tasks'
import { workflowsRouter } from './routers/workflows'
import { messagesRouter } from './routers/messages'
import { remindersRouter } from './routers/reminders'
import { notesRouter } from './routers/notes'
import { usersRouter } from './routers/users'
import { githubRouter } from './routers/github'
import { notificationsRouter } from './routers/notifications'
import { eventsRouter } from './routers/events'
import { ideasRouter } from './routers/ideas'
import { journalRouter } from './routers/journal'
import { resourcesRouter } from './routers/resources'
import { commentsRouter } from './routers/comments'
import { storageRouter } from './routers/storage'

export const appRouter = router({
  finance: financeRouter,
  tasks: tasksRouter,
  workflows: workflowsRouter,
  messages: messagesRouter,
  reminders: remindersRouter,
  notes: notesRouter,
  users: usersRouter,
  github: githubRouter,
  notifications: notificationsRouter,
  events: eventsRouter,
  ideas: ideasRouter,
  journal: journalRouter,
  resources: resourcesRouter,
  comments: commentsRouter,
  storage: storageRouter,
})

export type AppRouter = typeof appRouter
