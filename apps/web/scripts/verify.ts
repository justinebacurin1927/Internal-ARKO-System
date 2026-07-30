/**
 * End-to-end router verification against the real database.
 * Builds a tRPC caller with an ADMIN context and exercises CRUD across domains.
 */
import { prisma } from '@arko/db'
import { appRouter } from '../src/server/api/root'

async function main() {
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@arko.app' } })
  const ctx: any = {
    prisma,
    session: { user: { id: admin.id, email: admin.email, name: admin.name } },
    user: { id: admin.id, email: admin.email, name: admin.name },
    userRole: 'ADMIN',
  }
  const api = appRouter.createCaller(ctx)
  const results: string[] = []
  const ok = (d: string, v: unknown) => results.push(`✓ ${d.padEnd(16)} ${v}`)

  // notes
  const note = await api.notes.create({ title: 'Verify note', content: 'hi' })
  ok('notes', `created ${note.id}, list=${(await api.notes.list()).length}`)
  await api.notes.delete({ id: note.id })

  // tasks
  const task = await api.tasks.create({ title: 'Verify task', priority: 'HIGH' })
  ok('tasks', `created ${task.id}, list=${(await api.tasks.list()).length}`)

  // ideas + spawnTask
  const idea = await api.ideas.create({ title: 'Verify idea' })
  const spawned = await api.ideas.spawnTask({ id: idea.id })
  ok('ideas', `created ${idea.id}, spawned task ${spawned.id}, list=${(await api.ideas.list()).length}`)

  // events + sprints
  const ev = await api.events.create({ title: 'Verify event', date: new Date(), startTime: '09:00', endTime: '10:00' })
  const sp = await api.events.createSprint({ name: 'Sprint 1', startDate: new Date(), endDate: new Date() })
  ok('events', `event ${ev.id}, sprint ${sp.id}, events=${(await api.events.list()).length}`)

  // journal
  const j = await api.journal.create({ title: 'Verify journal', mood: 'good' })
  ok('journal', `created ${j.id}, list=${(await api.journal.list()).length}`)

  // resources
  const r = await api.resources.create({ title: 'Verify resource', url: 'https://example.com' })
  ok('resources', `created ${r.id}, list=${(await api.resources.list({})).total}`)

  // comments (polymorphic on the task above)
  const c = await api.comments.create({ resourceType: 'TASK', resourceId: task.id, content: 'nice' })
  ok('comments', `created ${c.id}, list=${(await api.comments.list({ resourceType: 'TASK', resourceId: task.id })).length}`)

  // notifications (seed one directly, then read via router)
  await prisma.notification.create({ data: { userId: admin.id, notifType: 'TEST', title: 'Hello' } })
  ok('notifications', `list=${(await api.notifications.list()).length}, unread=${await api.notifications.unreadCount()}`)

  // reminders
  const rem = await api.reminders.create({ title: 'Verify reminder', dueAt: new Date(Date.now() + 3600_000) })
  ok('reminders', `created ${rem.id}`)

  // finance
  const cats = await api.finance.getCategories()
  const tx = await api.finance.createTransaction({ amount: 100, type: 'INCOME', categoryId: cats[0].id })
  const bal = await api.finance.getBalance()
  const metric = await api.finance.upsertMetric({ key: 'mrr', name: 'MRR', value: 1000 })
  ok('finance', `cats=${cats.length}, tx=${tx.id}, balance=${bal.balance}, metric=${metric.id}`)

  // users
  ok('users', `me role=${(await prisma.user.findUnique({ where: { id: admin.id } }))?.role}`)

  console.log('\n=== ROUTER VERIFICATION (real DB) ===')
  console.log(results.join('\n'))
  console.log(`\nTotal tables in DB: ${(await prisma.$queryRawUnsafe<any[]>(`select count(*)::int as n from information_schema.tables where table_schema='public'`))[0].n}`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('VERIFICATION FAILED:', e)
  process.exit(1)
})
