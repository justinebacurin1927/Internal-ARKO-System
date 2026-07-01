/**
 * Seed finance data — categories and 6 months of transactions.
 *
 * Usage:
 *   npx tsx packages/db/prisma/seed-finance.ts
 *
 * Or via a one-liner from the workspace root:
 *   node -e "
 *     const { PrismaClient } = require('@prisma/client');
 *     new PrismaClient().transaction.deleteMany().then(() =>
 *       new PrismaClient().accountCategory.deleteMany()
 *     ).then(() => console.log('Cleaned'));
 *   "
 *   # then re-seed with the full script above
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const INCOME_CATEGORIES = [
  { name: 'Salary', type: 'CHECKING' as const, color: '#22c55e' },
  { name: 'Freelance', type: 'CHECKING' as const, color: '#6366f1' },
  { name: 'Investments', type: 'INVESTMENT' as const, color: '#3b82f6' },
  { name: 'Refunds', type: 'RECEIVABLE' as const, color: '#14b8a6' },
]

const EXPENSE_CATEGORIES = [
  { name: 'Rent', type: 'PAYABLE' as const, color: '#ef4444' },
  { name: 'Food & Drinks', type: 'CASH' as const, color: '#f97316' },
  { name: 'Utilities', type: 'PAYABLE' as const, color: '#eab308' },
  { name: 'Transportation', type: 'CASH' as const, color: '#8b5cf6' },
  { name: 'Subscriptions', type: 'CREDIT_CARD' as const, color: '#06b6d4' },
  { name: 'Shopping', type: 'CREDIT_CARD' as const, color: '#ec4899' },
  { name: 'Healthcare', type: 'PAYABLE' as const, color: '#10b981' },
  { name: 'Entertainment', type: 'CASH' as const, color: '#f472b6' },
]

async function main() {
  const user = await prisma.user.findFirst()
  if (!user) {
    console.error('No user found — create one first')
    process.exit(1)
  }

  // Find or create a second user for splits
  let secondUser = await prisma.user.findFirst({ where: { id: { not: user.id } } })
  if (!secondUser) {
    secondUser = await prisma.user.create({
      data: {
        name: 'Jane Doe',
        email: 'jane@arko.app',
        title: 'Accountant',
        role: 'MEMBER',
      },
    })
    console.log(`Created second user: ${secondUser.name} (${secondUser.email})`)
  }

  console.log(`Seeding for ${user.name} (${user.email})`)
  console.log(`Split partner: ${secondUser.name} (${secondUser.email})`)

  // Clean existing
  await prisma.splitShare.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.accountCategory.deleteMany()

  // Create categories
  const incomeCats = await Promise.all(
    INCOME_CATEGORIES.map((c) => prisma.accountCategory.create({ data: c })),
  )
  const expenseCats = await Promise.all(
    EXPENSE_CATEGORIES.map((c) => prisma.accountCategory.create({ data: c })),
  )
  console.log(`Created ${incomeCats.length + expenseCats.length} categories`)

  // Generate transactions
  const now = new Date()
  const transactions: any[] = []

  for (let m = 0; m < 6; m++) {
    const year = now.getFullYear()
    const month = now.getMonth() - m
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // 1-2 incomes per month (mix of PERSONAL and COMPANY)
    // Salary is always PERSONAL
    transactions.push({
      amount: 4500 + Math.round(Math.random() * 500),
      description: 'Monthly Salary',
      type: 'INCOME',
      scope: 'PERSONAL',
      categoryId: incomeCats[0].id,
      date: new Date(year, month, Math.min(15, daysInMonth)),
    })

    if (Math.random() > 0.3) {
      transactions.push({
        amount: 200 + Math.round(Math.random() * 800),
        description: 'Freelance Project',
        type: 'INCOME',
        scope: 'PERSONAL',
        categoryId: incomeCats[1].id,
        date: new Date(year, month, 5 + Math.floor(Math.random() * 20)),
      })
    }

    // Company income (every other month)
    if (m % 2 === 0) {
      transactions.push({
        amount: 3000 + Math.round(Math.random() * 2000),
        description: 'Client Payment',
        type: 'INCOME',
        scope: 'COMPANY',
        categoryId: incomeCats[0].id,
        date: new Date(year, month, Math.min(28, daysInMonth)),
      })
    }

    // 8-12 expenses per month — mix PERSONAL and COMPANY
    const descriptions = ['Payment', 'Purchase', 'Bill', 'Charge', 'Expense']
    const amounts: Record<number, [number, number]> = {
      0: [1200, 1500], 1: [15, 80], 2: [100, 300], 3: [10, 50],
      4: [10, 30], 5: [30, 200], 6: [50, 150], 7: [10, 60],
    }

    for (let i = 0; i < 8 + Math.floor(Math.random() * 5); i++) {
      const idx = Math.floor(Math.random() * expenseCats.length)
      const [min, max] = amounts[idx] ?? [20, 100]
      // ~20% of expenses are COMPANY
      const scope = Math.random() < 0.2 ? 'COMPANY' : 'PERSONAL'
      transactions.push({
        amount: min + Math.round(Math.random() * (max - min)),
        description: `${expenseCats[idx].name} ${descriptions[Math.floor(Math.random() * descriptions.length)]}`,
        type: 'EXPENSE',
        scope,
        categoryId: expenseCats[idx].id,
        date: new Date(year, month, 1 + Math.floor(Math.random() * daysInMonth)),
      })
    }
  }

  // Insert transactions, tracking IDs for splits
  const createdTxIds: string[] = []

  for (const tx of transactions) {
    const created = await prisma.transaction.create({
      data: {
        amount: tx.amount,
        description: tx.description,
        type: tx.type as any,
        scope: tx.scope ?? 'PERSONAL',
        categoryId: tx.categoryId,
        userId: user.id,
        date: tx.date,
      },
    })
    createdTxIds.push(created.id)
  }

  // Create some split transactions (recent months only)
  // Pick 3 recent PERSONAL expense transactions to split
  console.log('\nCreating split shares...')
  const recentPersonalTx = await prisma.transaction.findMany({
    where: { userId: user.id, type: 'EXPENSE', scope: 'PERSONAL' },
    orderBy: { date: 'desc' },
    take: 8,
  })

  for (let i = 0; i < Math.min(3, recentPersonalTx.length); i++) {
    const tx = recentPersonalTx[i]
    const splitAmount = Math.round(tx.amount * 0.5 * 100) / 100

    await prisma.transaction.update({
      where: { id: tx.id },
      data: { isSplit: true },
    })

    await prisma.splitShare.create({
      data: {
        transactionId: tx.id,
        userId: secondUser!.id,
        amount: splitAmount,
        settled: i !== 0, // first one is unsettled (pending)
      },
    })

    console.log(`  Split "${tx.description}": ₱${tx.amount} — ${secondUser!.name} owes ₱${splitAmount}${i === 0 ? ' (PENDING)' : ''}`)
  }

  // Summary
  const totals = await prisma.transaction.aggregate({
    where: { userId: user.id, type: 'INCOME' },
    _sum: { amount: true },
  })
  const expenseTotals = await prisma.transaction.aggregate({
    where: { userId: user.id, type: 'EXPENSE' },
    _sum: { amount: true },
  })
  const personalTotals = await prisma.transaction.aggregate({
    where: { userId: user.id, scope: 'PERSONAL' },
    _sum: { amount: true },
  })
  const companyTotals = await prisma.transaction.aggregate({
    where: { userId: user.id, scope: 'COMPANY' },
    _sum: { amount: true },
  })
  const pendingCount = await prisma.splitShare.count({ where: { userId: secondUser!.id, settled: false } })

  console.log(`\nSeeded ${transactions.length} transactions`)
  console.log(`Income:  ₱${(totals._sum.amount ?? 0).toLocaleString()}`)
  console.log(`Expense: ₱${(expenseTotals._sum.amount ?? 0).toLocaleString()}`)
  console.log(`Balance: ₱${((totals._sum.amount ?? 0) - (expenseTotals._sum.amount ?? 0)).toLocaleString()}`)
  console.log(`Personal: ₱${(personalTotals._sum.amount ?? 0).toLocaleString()}`)
  console.log(`Company: ₱${(companyTotals._sum.amount ?? 0).toLocaleString()}`)
  console.log(`Pending splits: ${pendingCount}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
