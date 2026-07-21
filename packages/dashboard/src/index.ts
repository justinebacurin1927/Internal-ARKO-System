// Dashboard — widget types and aggregation utilities

export interface DashboardWidget {
  id: string
  title: string
  type: 'stat' | 'chart' | 'list' | 'calendar'
  config: Record<string, unknown>
  order: number
}

export interface StatCard {
  label: string
  value: number | string
  change?: number
  trend?: 'up' | 'down' | 'neutral'
}
