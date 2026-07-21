// Workflow Engine — state machine for business process automation

export type WorkflowStep = {
  id: string
  name: string
  type: 'action' | 'approval' | 'notification' | 'condition'
  config: Record<string, unknown>
  next?: string
}

export type WorkflowDefinition = {
  name: string
  description?: string
  version: string
  steps: WorkflowStep[]
  triggers: string[]
}

export type WorkflowState = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export function validateWorkflow(def: WorkflowDefinition): string[] {
  const errors: string[] = []
  if (!def.name) errors.push('Workflow requires a name')
  if (!def.steps || def.steps.length === 0) errors.push('Workflow requires at least one step')
  if (!def.triggers || def.triggers.length === 0) errors.push('Workflow requires at least one trigger')

  const stepIds = new Set(def.steps.map((s) => s.id))
  for (const step of def.steps) {
    if (step.next && !stepIds.has(step.next)) {
      errors.push(`Step "${step.id}" references unknown next step: "${step.next}"`)
    }
  }
  return errors
}
