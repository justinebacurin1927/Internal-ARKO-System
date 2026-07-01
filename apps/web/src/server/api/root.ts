import { router } from './trpc'
import { financeRouter } from './routers/finance'
import { tasksRouter } from './routers/tasks'
import { workflowsRouter } from './routers/workflows'
import { messagesRouter } from './routers/messages'
import { remindersRouter } from './routers/reminders'
import { notesRouter } from './routers/notes'
import { usersRouter } from './routers/users'
import { githubRouter } from './routers/github'

export const appRouter = router({
  finance: financeRouter,
  tasks: tasksRouter,
  workflows: workflowsRouter,
  messages: messagesRouter,
  reminders: remindersRouter,
  notes: notesRouter,
  users: usersRouter,
  github: githubRouter,
})

export type AppRouter = typeof appRouter
