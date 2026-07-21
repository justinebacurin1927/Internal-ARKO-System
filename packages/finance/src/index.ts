// Finance Engine — bounded context for transaction management
// Types, validators, and business logic for finance operations

export interface Transaction {
  id: string
  amount: number
  description: string | null
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  categoryId: string
  userId: string
  date: Date
}

export function calculateBalance(transactions: Transaction[]): number {
  return transactions.reduce((acc, t) => {
    if (t.type === 'INCOME') return acc + t.amount
    if (t.type === 'EXPENSE') return acc - t.amount
    return acc
  }, 0)
}

export function formatCurrency(amount: number, currency = 'PHP'): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
  }).format(amount)
}
