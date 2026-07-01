import { router } from './trpc'
import { financeRouter } from './routers/finance'
import { tasksRouter } from './routers/tasks'
import { workflowsRouter } from './routers/workflows'

export const appRouter = router({
  finance: financeRouter,
  tasks: tasksRouter,
  workflows: workflowsRouter,
})

export type AppRouter = typeof appRouter
