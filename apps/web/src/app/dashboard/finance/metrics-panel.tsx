'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@arko/ui'
import { TrendingUp, TrendingDown, Minus, Edit3, Loader2, Plus, AlertCircle } from 'lucide-react'
import { api } from '../../../lib/trpc/client'

interface MetricEditState {
  key: string
  value: string
}

export function MetricsPanel() {
  const { data: metrics, isLoading, isError, refetch } = api.finance.listMetrics.useQuery()
  const utils = api.useUtils()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editing, setEditing] = useState<MetricEditState | null>(null)

  const upsertMut = api.finance.upsertMetric.useMutation({
    onSuccess: () => {
      utils.finance.listMetrics.invalidate()
      setEditing(null)
      setShowAddForm(false)
      setNewKey('')
      setNewName('')
      setNewValue('')
    },
  })

  // New metric form state
  const [newKey, setNewKey] = useState('')
  const [newName, setNewName] = useState('')
  const [newValue, setNewValue] = useState('')

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Business Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Business Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-red-300 mb-2" />
            <p className="text-sm text-red-600">Failed to load metrics</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const metricList = metrics ?? []

  function handleUpsert(key: string, currentName: string) {
    if (!editing || editing.key !== key) return
    const val = parseFloat(editing.value)
    if (isNaN(val)) return
    upsertMut.mutate({
      key,
      name: currentName,
      value: val,
    })
  }

  function handleCreateMetric() {
    const val = parseFloat(newValue)
    if (!newKey.trim() || !newName.trim() || isNaN(val)) return
    upsertMut.mutate({
      key: newKey.trim(),
      name: newName.trim(),
      value: val,
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Business Metrics</CardTitle>
        {metricList.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="h-3.5 w-3.5" />
            {showAddForm ? 'Cancel' : 'Add Metric'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {metricList.length === 0 && !showAddForm ? (
          <div className="flex flex-col items-center py-12 text-center">
            <TrendingUp className="h-10 w-10 text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">No metrics yet</p>
            <Button size="sm" className="mt-3" onClick={() => setShowAddForm(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add Metric
            </Button>
          </div>
        ) : (
          <>
            {/* New metric form */}
            {showAddForm && (
              <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-700 mb-3">New Metric</p>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Key (e.g. revenue)"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Display name (e.g. Monthly Revenue)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Value"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                    />
                    <Button
                      size="sm"
                      onClick={handleCreateMetric}
                      disabled={upsertMut.isPending || !newKey.trim() || !newName.trim() || !newValue}
                    >
                      {upsertMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Metrics grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {metricList.map((m) => {
                const isEditing = editing?.key === m.key
                const isUp = m.upIsGood ? m.value > 0 : m.value < 0
                const isDown = m.upIsGood ? m.value < 0 : m.value > 0
                const isNeutral = m.value === 0

                const displayValue = m.suffix
                  ? `${m.value.toFixed(m.decimals)}${m.suffix}`
                  : m.value.toLocaleString(undefined, { minimumFractionDigits: m.decimals, maximumFractionDigits: m.decimals })

                return (
                  <div key={m.key} className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{m.name}</p>
                      <div className="flex items-center gap-1">
                        {isNeutral ? (
                          <Minus className="h-4 w-4 text-gray-300" />
                        ) : isUp ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <button
                          onClick={() => setEditing(isEditing ? null : { key: m.key, value: String(m.value) })}
                          className="rounded p-0.5 text-gray-300 hover:text-gray-600 transition-colors"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.01"
                          value={editing!.value}
                          onChange={(e) => setEditing({ key: m.key, value: e.target.value })}
                          className="w-full rounded border border-primary-300 px-2 py-1 text-sm font-semibold focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpsert(m.key, m.name)
                            if (e.key === 'Escape') setEditing(null)
                          }}
                        />
                        <button
                          onClick={() => handleUpsert(m.key, m.name)}
                          className="rounded bg-primary-600 px-2 py-1 text-xs font-medium text-white hover:bg-primary-700 transition-colors"
                        >
                          {upsertMut.isPending && editing?.key === m.key ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                        </button>
                      </div>
                    ) : (
                      <p className="text-xl font-bold text-gray-900">{displayValue}</p>
                    )}

                    <p className="text-[10px] text-gray-400 mt-1">
                      {m.calculation === 'sum' ? 'Auto-summed' : m.calculation}
                    </p>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
