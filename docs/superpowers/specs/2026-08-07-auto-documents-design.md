# ARKO — Auto-Created Client Documents Design

Date: 2026-08-07
Status: Design gate passed (user approved — "1")

## Goal

Add a **Documents** page to the Arko dashboard that lets the studio operator **auto-create
client documents (invoices, service agreements, proposals)** from an existing client project's
real data, review/edit them, and publish a shareable on-screen document **plus a downloadable
PDF**.

Product anchor (from the landing page + codebase): Arko is a **software studio** ("We build
websites, mobile apps, automation, AI tools") run by a single operator, with clients modeled as
`User` rows and client work modeled as `ClientProject` (milestones, deliverables, updates,
requests). Finance is modeled as `Transaction`/`AccountCategory`. There is currently **no
invoice, agreement, proposal, or document generation** anywhere in the app, and **no AI
integration** — per user decision, this feature is **deterministic templates, values
auto-filled** (no AI).

## Decisions (locked)

- **Generation:** deterministic templates, auto-filled from a selected `ClientProject`. No AI.
- **Document types (v1):** Invoice · Service Agreement · Proposal. ("all" was chosen; each is
  a minimal, data-driven template for v1.)
- **Output:** on-screen editable document + a public share link (read-only) **and** PDF download.
- **Relation:** documents **tie to a client project** (`ClientProject`); the client is derived
  from the project's `clientId`.
- **Route/nav:** new `/dashboard/documents` + nav item (beside Finance/Tasks/Client Portal).
- **PDF:** rendered client-side with `@react-pdf/renderer` (chosen over `react-pdf`/`pdf-lib`
  for the clean React tree + deterministic style; runtime PDFs are downloaded, not server-baked).

## Data model (new, in `packages/db/prisma/schema.prisma`)

### `Document`

```prisma
model Document {
  id            String        @id @default(cuid())
  type          DocumentType
  title         String
  status        DocumentStatus @default(DRAFT)   // DRAFT | PUBLISHED | ARCHIVED
  invoiceNumber String?                            // e.g. "INV-2026-0007"; null for non-invoices
  projectId     String?
  clientId      String?                            // snapshot of client at publish time
  content       Json          @default("{}")      // rendered doc structure (sections/line items)
  issueDate     DateTime?
  dueDate       DateTime?
  shareToken    String?       @unique              // opaque token for the public share URL
  publishedAt   DateTime?
  createdById   String
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  project ClientProject? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  client User?           @relation(fields: [clientId], references: [id], onDelete: SetNull)
  createdBy User        @relation(fields: [createdById], references: [id], onDelete: Restrict)
  lineItems DocumentLineItem[]

  @@index([createdById, status])
  @@index([projectId])
}
```

### `DocumentLineItem`

```prisma
model DocumentLineItem {
  id          String @id @default(cuid())
  documentId  String
  description String
  quantity    Float  @default(1)
  unitPrice   Float  @default(0)
  sortOrder   Int    @default(0)
  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([documentId])
}
```

- **No totals column** — totals are computed (`Σ quantity × unitPrice`) at render/print time,
  never stored (avoids drift).
- `content` `Json` holds the document's structured body (sections like "Scope", "Terms",
  "Payment schedule") so templates are data, not code. `lineItems` are a separate child table so
  invoices can be edited/additive without rewriting the whole JSON blob.
- Client name/email are **snapshotted into `clientId`** at creation from the project's client —
  editing a project later doesn't retro-edit a published invoice. The full client snapshot lives
  in `content` (e.g. `content.billTo`) so a deleted client user doesn't break an old invoice.
- `invoiceNumber` auto-generated as `INV-YYYY-<seq>` when a published invoice has none.

### Enum

```prisma
enum DocumentType {
  INVOICE
  AGREEMENT
  PROPOSAL
}

enum DocumentStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

### Required additions to existing models (for valid Prisma relations)

- Add to `User`: `docsCreated Document[] @relation("CreatedDocs")` and
  `clientDocs Document[] @relation("DocClient")`.
- Add to `ClientProject`: `documents Document[]`.
- These are the only edits to existing models; no column/behavior changes.

`ClientProject.clientId` already points at the client `User`, which is what `create` reads to
snapshot into `Document.clientId`.

## Router (`apps/web/src/server/api/routers/documents.ts`)

Follows the existing `finance`/`client-portal` router pattern (`router` + `protectedProcedure`,
TRPCError for auth/validation):

- `list` — all docs for the current user (owner `createdById`), newest first. Optional
  `status`/`type` filters.
- `create` — input: `{ projectId, type, title? }`. Loads the `ClientProject` + its client +
  milestones + deliverables; fills a template; creates `Document` + `DocumentLineItem[]`.
- `get` — one doc by id (owner-scoped).
- `update` — patch title/status/issueDate/dueDate/content/lineItems. Status transitions:
  `DRAFT → PUBLISHED` allowed; `PUBLISHED → ARCHIVED` allowed; `ARCHIVED` read-only (frozen).
  If status goes to `PUBLISHED` and type is INVOICE and no `invoiceNumber`, assign one.
- `delete` — owner-only; only `DRAFT` can be deleted.
- `getShareInfo` / `generateShareToken` — creates/rotates `shareToken`.
- Public read (no auth): `share.get` — takes `token`, returns the document if `status=PUBLISHED`
  and the token matches. **Public route returns only render-safe data** (no `createdById`).

### Authorization
- Mutations: `createdById === ctx.user.id` else `FORBIDDEN`.
- Public share read: only `status === PUBLISHED` + matching `shareToken`. DRAFT/ARCHIVED → 404
  (not 403, to avoid leaking existence).

## Templates (auto-fill)

Each type is a deterministic builder from the project's data:

| Field | Invoice | Agreement | Proposal |
|---|---|---|---|
| Bill-to / party | client name+email (from `content.billTo`) | client name+email | client name+email |
| Scope lines | `ProjectMilestone` (done+pending) | milestones + deliverables | summary + milestones |
| Line items | milestones/deliverables w/ unit price from project, editable | — (narrative sections) | deliverables w/ placeholder price |
| Numbers | invoiceNumber, issueDate=now, dueDate=+30d | — | issueDate=now |
| Totals | computed `Σ qty×unitPrice` | — | computed (if line items) |

Template builders live in a single module `apps/web/src/lib/documents/templates.ts` —
pure functions `(project, client, now) → { sections, lineItems }`. This keeps them unit-testable
and identical for server-side create + client-side preview.

## Page / UI (`apps/web/src/app/dashboard/documents/`)

- `page.tsx` — list view: cards/table of documents (title, type badge, status, date, project,
  "New document" button, share/download actions).
- `new.tsx` — step 1: pick a client project; step 2: choose type; step 3: preview auto-filled
  doc; "Save draft" / "Publish".
- `[id]/page.tsx` — edit view: editable title, dates, line items (add/remove/edit), sections;
  Save / Publish / Archive / Delete (draft) / "Share" (copy link) / "Download PDF".
- `share/[token]/page.tsx` — **public, unauthenticated** layout: read-only rendered document,
  print-friendly. No nav, no client JS interactivity.
- Add nav item to `apps/web/src/app/dashboard/nav.tsx` (icon: `FileText` or `FileBadge`).
- Reuse `@arko/ui` primitives + existing dashboard styling.

## PDF generation

- Client-side component `<DocumentPdf doc={...} />` using `@react-pdf/renderer`, rendered on a
  hidden mount and downloaded via `pdf(<DocumentPdf/>).toBlob()`. Deterministic styles mirroring
  the on-screen document. Not server-side (no lambda/PDF dep in this repo yet; client-side keeps
  v1 simple and deployable on Vercel).

## Error handling

- Missing project / missing client at create → `BAD_REQUEST` with a clear message.
- Deleting/updating a non-owned doc → `FORBIDDEN`.
- Public share of non-published doc → `404`.
- PDF generation failure → surfaced in the UI as a toast; document remains usable on-screen.

## Testing

- Router tests (mirroring `apps/web/src/server/api/routers/__tests__/`):
  - create fills template + line items from project milestones/deliverables;
  - totals computed correctly (Σ qty×unitPrice), including decimal/zero cases;
  - status transitions enforced (DRAFT→PUBLISHED→ARCHIVED, frozen after);
  - authz: non-owner update/delete → FORBIDDEN; share of DRAFT → 404;
  - invoiceNumber assigned once on first publish, not regenerated.
- Template unit tests (`lib/documents/templates.ts`) — pure, no DB.

## Non-goals (deferred)

- Email-send of documents (client portal messaging exists; wiring email is a later step).
- e-signature / legal signing.
- Billing hours → invoice automation (needs a billable-hours model).
- Multiple currencies / tax-rate presets.
- AI drafting (user chose deterministic templates).

## Out of scope
- No changes to Finance/Tasks/Client Portal. No changes to `User`/`ClientProject` schema.
- No new infra. Deployable on the existing Vercel/Neon setup.
