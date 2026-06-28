// Shared helpers for the polymorphic Comment / Attachment relations.
// Exactly one of task / document / storyboard is set on each row.

export type EntityType = "task" | "document" | "storyboard";

export const ENTITY_TYPES: EntityType[] = ["task", "document", "storyboard"];

/** Maps an entity type + id to the Prisma FK field, e.g. { taskId: "abc" }. */
export function entityWhere(type: EntityType, id: string) {
  switch (type) {
    case "task":
      return { taskId: id };
    case "document":
      return { documentId: id };
    case "storyboard":
      return { storyboardId: id };
  }
}

/** Validates that exactly one polymorphic FK is set. */
export function assertSingleParent(fks: {
  taskId?: string | null;
  documentId?: string | null;
  storyboardId?: string | null;
}) {
  const set = [fks.taskId, fks.documentId, fks.storyboardId].filter(Boolean);
  if (set.length !== 1) {
    throw new Error("Exactly one parent (task/document/storyboard) is required");
  }
}
