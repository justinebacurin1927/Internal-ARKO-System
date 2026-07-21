// Task Management — types and utilities for task operations

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface TaskItem {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  assigneeId: string | null
  dueDate: Date | null
  position: number
}

export const STATUS_FLOW: Record<TaskStatus, TaskStatus[]> = {
  TODO: ['IN_PROGRESS'],
  IN_PROGRESS: ['REVIEW', 'TODO'],
  REVIEW: ['DONE', 'IN_PROGRESS'],
  DONE: [],
}

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return STATUS_FLOW[from]?.includes(to) ?? false
}
