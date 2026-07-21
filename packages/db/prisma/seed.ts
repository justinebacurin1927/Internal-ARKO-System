import { PrismaClient, AccountType } from '@prisma/client'

const prisma = new PrismaClient()

const defaultCategories = [
  { name: 'Checking Account', type: AccountType.CHECKING, color: '#10b981', icon: 'wallet' },
  { name: 'Savings Account', type: AccountType.SAVINGS, color: '#3b82f6', icon: 'piggy-bank' },
  { name: 'Credit Card', type: AccountType.CREDIT_CARD, color: '#ef4444', icon: 'credit-card' },
  { name: 'Cash', type: AccountType.CASH, color: '#f59e0b', icon: 'banknote' },
  { name: 'Investments', type: AccountType.INVESTMENT, color: '#8b5cf6', icon: 'trending-up' },
  { name: 'Receivables', type: AccountType.RECEIVABLE, color: '#06b6d4', icon: 'arrow-right' },
  { name: 'Payables', type: AccountType.PAYABLE, color: '#f97316', icon: 'arrow-left' },
]

async function main() {
  console.log('Seeding categories...')

  for (const cat of defaultCategories) {
    await prisma.accountCategory.upsert({
      where: { id: cat.name.toLowerCase().replace(/\s+/g, '-') },
      update: { name: cat.name, type: cat.type, color: cat.color, icon: cat.icon },
      create: {
        id: cat.name.toLowerCase().replace(/\s+/g, '-'),
        name: cat.name,
        type: cat.type,
        color: cat.color,
        icon: cat.icon,
      },
    })
  }

  console.log(`Seeded ${defaultCategories.length} categories`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
