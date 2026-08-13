> **STATUS: NOT BEING IMPLEMENTED.** Decision 2026-08-13 — the user reviewed this
> spec and a gap analysis of it and decided against building it. Kept as reference
> only. Do not start MK-01..MK-09, do not create a `riwaq-media-kernel/` monorepo,
> and do not treat anything below as a work order.
>
> Gap analysis that informed the decision:
> `docs/architecture/v9-media-kernel-gap-analysis.md`

# Riwaq Al Ilm — Version 9: Media Kernel (MK)

**Status:** Implementation-Grade Engineering Specification  
**Purpose:** Convert the Version 8 Media Operating System into a governed, buildable kernel that can safely orchestrate content generation, human approval, publishing, analytics, and continuous optimization.

---

## 1. Executive Objective

The Media Kernel is the trusted runtime foundation of the Riwaq Al Ilm Media Operating System.

Its responsibilities are to:

- orchestrate AI agents and deterministic services;
- maintain canonical content objects and versions;
- enforce brand and Islamic-content governance;
- manage approval workflows;
- provide authentication and role-based access control;
- execute prompt workflows;
- manage content state transitions;
- publish through approved platform adapters;
- preserve audit history;
- provide analytics and experiment infrastructure;
- support future multi-academy / multi-tenant operation without compromising tenant isolation.

The Media Kernel must remain independent of any single AI provider, social network, rendering system, or storage provider.

---

# 2. Architectural Principles

## MK-P1 — Human Authority

AI may draft, analyze, score, and recommend.

AI must not autonomously publish religious, teacher-specific, testimonial, legal, or paid-ad content unless explicitly allowed by a governed policy.

## MK-P2 — Canonical Objects

Every content object has:

- immutable canonical ID;
- version;
- lifecycle status;
- ownership;
- provenance;
- audit history.

## MK-P3 — Provider Abstraction

Google Flow, image models, LLM providers, Meta, WhatsApp, Cloudflare R2, and analytics providers must be accessed through adapters.

No business logic should depend directly on a provider SDK.

## MK-P4 — Reproducibility

Every generated artifact must retain:

- prompt version;
- model/provider;
- input references;
- generated-at timestamp;
- agent identity;
- settings;
- parent object version.

## MK-P5 — Fail Closed

If Quranic Arabic, hadith attribution, teacher identity, brand assets, or approval state cannot be verified, publishing must stop.

## MK-P6 — Observability by Default

Every significant execution emits:

- trace ID;
- actor;
- object ID;
- operation;
- result;
- latency;
- error metadata.

---

# 3. Target Architecture

```text
                        ┌───────────────────────────┐
                        │      Next.js Portal       │
                        │ Studio / Review / Reports │
                        └─────────────┬─────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                      MEDIA KERNEL API                            │
│                                                                  │
│ Auth │ RBAC │ Content Registry │ Workflow │ Prompt Runtime       │
│ Audit│ Policy│ Approval Engine  │ Events   │ Adapter Registry     │
└──────┬───────────┬──────────────┬───────────────┬────────────────┘
       │           │              │               │
       ▼           ▼              ▼               ▼
 PostgreSQL     Redis/Event     Job Workers     Object Storage
 Canonical DB      Bus          / Queues        Cloudflare R2
       │
       ├─────────────── External Provider Adapters ────────────────┐
       │                                                           │
       ▼                                                           ▼
 LLM / Image / Flow                                         Meta / Analytics
```

---

# 4. Monorepo

```text
riwaq-media-kernel/
├── apps/
│   ├── portal/                 # Next.js admin / studio UI
│   ├── api/                    # Kernel API
│   ├── worker/                 # Async workers
│   └── scheduler/              # Scheduled jobs
│
├── packages/
│   ├── kernel/
│   │   ├── identity/
│   │   ├── authorization/
│   │   ├── content/
│   │   ├── workflow/
│   │   ├── approvals/
│   │   ├── prompt-runtime/
│   │   ├── policy/
│   │   ├── provenance/
│   │   ├── audit/
│   │   └── events/
│   │
│   ├── agents/
│   │   ├── strategy-agent/
│   │   ├── caption-agent/
│   │   ├── image-prompt-agent/
│   │   ├── flow-agent/
│   │   ├── teacher-agent/
│   │   ├── testimonial-agent/
│   │   ├── qa-agent/
│   │   └── brand-guardian/
│   │
│   ├── adapters/
│   │   ├── llm/
│   │   ├── image/
│   │   ├── flow/
│   │   ├── meta/
│   │   ├── r2/
│   │   ├── analytics/
│   │   └── notifications/
│   │
│   ├── db/
│   ├── contracts/
│   ├── observability/
│   ├── ui/
│   └── config/
│
├── infrastructure/
│   ├── docker/
│   ├── migrations/
│   ├── deployment/
│   └── monitoring/
│
├── governance/
│   ├── policies/
│   ├── brand/
│   ├── islamic-content/
│   ├── approvals/
│   └── adr/
│
├── prompts/
│   ├── system/
│   ├── agents/
│   ├── campaigns/
│   ├── teachers/
│   └── flow/
│
├── tests/
│   ├── contract/
│   ├── integration/
│   ├── e2e/
│   └── policy/
│
├── CLAUDE.md
├── docker-compose.yml
├── pnpm-workspace.yaml
└── turbo.json
```

---

# 5. Canonical Domain Model

## 5.1 Core Objects

```text
Workspace
User
Membership
Role
Teacher
ContentItem
ContentVersion
Prompt
PromptVersion
GenerationRun
MediaAsset
Campaign
Approval
Schedule
Publication
AnalyticsSnapshot
Experiment
AuditEvent
```

## 5.2 Content Types

```text
FACEBOOK_POST
INSTAGRAM_POST
INSTAGRAM_STORY
FACEBOOK_STORY
REEL
PINTEREST_PIN
TEACHER_SPOTLIGHT
TESTIMONIAL
DUA_POST
QURAN_POST
PARENT_STORY
CAMPAIGN_AD
```

## 5.3 Lifecycle

```text
IDEA
  ↓
DRAFT
  ↓
GENERATED
  ↓
QA_PENDING
  ↓
REVIEW_PENDING
  ↓
APPROVED
  ↓
SCHEDULED
  ↓
PUBLISHED
  ↓
MEASURED
  ↓
ARCHIVED
```

Exceptional states:

```text
REJECTED
BLOCKED
FAILED
CANCELLED
SUPERSEDED
```

---

# 6. Prisma Schema — Initial Kernel

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum ContentStatus {
  IDEA
  DRAFT
  GENERATED
  QA_PENDING
  REVIEW_PENDING
  APPROVED
  SCHEDULED
  PUBLISHED
  MEASURED
  ARCHIVED
  REJECTED
  BLOCKED
  FAILED
  CANCELLED
  SUPERSEDED
}

enum ContentType {
  FACEBOOK_POST
  INSTAGRAM_POST
  FACEBOOK_STORY
  INSTAGRAM_STORY
  REEL
  PINTEREST_PIN
  TEACHER_SPOTLIGHT
  TESTIMONIAL
  DUA_POST
  QURAN_POST
  PARENT_STORY
  CAMPAIGN_AD
}

enum ApprovalDecision {
  APPROVED
  REJECTED
  CHANGES_REQUESTED
}

model Workspace {
  id          String       @id @default(cuid())
  slug        String       @unique
  name        String
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  memberships Membership[]
  content     ContentItem[]
  campaigns   Campaign[]
}

model User {
  id          String       @id @default(cuid())
  email       String       @unique
  name        String?
  createdAt   DateTime     @default(now())
  memberships Membership[]
  approvals   Approval[]
}

model Membership {
  id          String    @id @default(cuid())
  workspaceId String
  userId      String
  role        String
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  user        User      @relation(fields: [userId], references: [id])

  @@unique([workspaceId, userId])
}

model Teacher {
  id             String   @id @default(cuid())
  workspaceId    String
  canonicalName  String
  faculty        String?
  department     String?
  university     String?
  biography      String?
  photoAssetId   String?
  authoritativeSource String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model ContentItem {
  id            String           @id @default(cuid())
  workspaceId   String
  type          ContentType
  status        ContentStatus    @default(IDEA)
  title         String
  currentVersion Int             @default(1)
  createdById   String?
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt
  workspace     Workspace        @relation(fields: [workspaceId], references: [id])
  versions      ContentVersion[]
  approvals     Approval[]
  schedules     Schedule[]
  publications  Publication[]
}

model ContentVersion {
  id            String      @id @default(cuid())
  contentItemId String
  version       Int
  payload       Json
  provenance    Json?
  createdBy     String?
  createdAt     DateTime    @default(now())
  contentItem   ContentItem @relation(fields: [contentItemId], references: [id])

  @@unique([contentItemId, version])
}

model Prompt {
  id          String          @id @default(cuid())
  key         String          @unique
  name        String
  versions    PromptVersion[]
}

model PromptVersion {
  id          String   @id @default(cuid())
  promptId    String
  version     Int
  body        String
  checksum    String
  createdAt   DateTime @default(now())
  prompt      Prompt   @relation(fields: [promptId], references: [id])

  @@unique([promptId, version])
}

model GenerationRun {
  id              String   @id @default(cuid())
  contentItemId   String?
  promptVersionId String?
  agentKey        String
  provider        String
  model           String
  requestPayload  Json
  responsePayload Json?
  status          String
  traceId         String
  startedAt       DateTime @default(now())
  completedAt     DateTime?
}

model MediaAsset {
  id          String   @id @default(cuid())
  workspaceId String
  kind        String
  storageKey  String
  mimeType    String
  checksum    String
  provenance  Json?
  createdAt   DateTime @default(now())
}

model Campaign {
  id          String    @id @default(cuid())
  workspaceId String
  name        String
  objective   String?
  startsAt    DateTime?
  endsAt      DateTime?
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
}

model Approval {
  id            String            @id @default(cuid())
  contentItemId String
  reviewerId    String
  decision      ApprovalDecision
  reason        String?
  createdAt     DateTime          @default(now())
  contentItem   ContentItem       @relation(fields: [contentItemId], references: [id])
  reviewer      User              @relation(fields: [reviewerId], references: [id])
}

model Schedule {
  id            String      @id @default(cuid())
  contentItemId String
  platform      String
  scheduledAt   DateTime
  status        String
  contentItem   ContentItem @relation(fields: [contentItemId], references: [id])
}

model Publication {
  id            String      @id @default(cuid())
  contentItemId String
  platform      String
  externalId    String?
  publishedAt   DateTime?
  status        String
  response      Json?
  contentItem   ContentItem @relation(fields: [contentItemId], references: [id])
}

model AnalyticsSnapshot {
  id            String   @id @default(cuid())
  publicationId String
  capturedAt    DateTime @default(now())
  metrics       Json
}

model Experiment {
  id          String   @id @default(cuid())
  workspaceId String
  name        String
  hypothesis  String
  status      String
  config      Json
  createdAt   DateTime @default(now())
}

model AuditEvent {
  id          String   @id @default(cuid())
  workspaceId String?
  actorId     String?
  action      String
  objectType  String
  objectId    String
  payload     Json?
  traceId     String?
  createdAt   DateTime @default(now())
}
```

---

# 7. Authentication and RBAC

## Roles

```text
OWNER
ADMIN
MARKETING_MANAGER
CONTENT_EDITOR
ISLAMIC_REVIEWER
TEACHER_REVIEWER
PUBLISHER
ANALYST
VIEWER
```

## High-Level Permissions

| Action                  | Owner/Admin | Manager | Editor | Islamic Reviewer | Publisher |
| ----------------------- | ----------: | ------: | -----: | ---------------: | --------: |
| Create drafts           |           ✓ |       ✓ |      ✓ |                — |         — |
| Generate AI content     |           ✓ |       ✓ |      ✓ |                — |         — |
| Approve generic content |           ✓ |       ✓ |      — |                — |         — |
| Approve Quran/Hadith    |           ✓ |       — |      — |                ✓ |         — |
| Approve teacher profile |           ✓ |       ✓ |      — |                — |         — |
| Schedule                |           ✓ |       ✓ |      — |                — |         ✓ |
| Publish                 |           ✓ |       — |      — |                — |         ✓ |
| Change brand policy     |           ✓ |       — |      — |                — |         — |

All authorization checks are server-side.

---

# 8. Approval Workflow Engine

## Generic Post

```text
DRAFT
→ GENERATED
→ QA_PENDING
→ REVIEW_PENDING
→ APPROVED
→ SCHEDULED
→ PUBLISHED
```

## Religious Content

```text
DRAFT
→ GENERATED
→ QA_PENDING
→ ISLAMIC_REVIEW_REQUIRED
→ REVIEW_PENDING
→ APPROVED
→ SCHEDULED
→ PUBLISHED
```

## Teacher Content

Requires:

- authoritative teacher profile;
- approved real photograph;
- credential verification;
- teacher/profile reviewer approval.

## Testimonials

Requires:

- source record;
- consent/usage status;
- no invented claims;
- exact quote preservation where quoted.

---

# 9. Policy Engine

Every content object is evaluated against policies before approval and publishing.

## Policy Categories

```text
BRAND
QURANIC_TEXT
HADITH_ATTRIBUTION
TEACHER_IDENTITY
TESTIMONIAL_INTEGRITY
CHILD_SAFETY
PLATFORM_COMPLIANCE
COPYRIGHT
PRIVACY
PAID_ADS
```

## Policy Response

```json
{
  "decision": "PASS | WARN | BLOCK",
  "policy": "QURANIC_TEXT",
  "rule": "QURAN-001",
  "reason": "Arabic text differs from approved canonical source.",
  "evidence": {},
  "requiredAction": "Islamic reviewer correction required."
}
```

`BLOCK` prevents scheduling and publishing.

---

# 10. Prompt Execution Runtime

## Prompt Envelope

```json
{
  "promptKey": "caption.facebook.parent-story",
  "promptVersion": 4,
  "agent": "caption-agent",
  "workspaceId": "riwaq-al-ilm",
  "input": {},
  "brandContextVersion": 3,
  "knowledgeRefs": [],
  "outputSchema": "FacebookPostV1"
}
```

## Execution Stages

```text
resolve prompt
→ resolve context
→ policy pre-check
→ invoke provider
→ validate schema
→ brand review
→ content QA
→ persist generation run
→ create content version
```

Never overwrite a previous content version.

---

# 11. Agent Contract

Every agent implements:

```ts
export interface MediaAgent<I, O> {
  key: string;
  version: string;
  execute(input: I, ctx: AgentContext): Promise<AgentResult<O>>;
}
```

Agent result:

```ts
type AgentResult<T> = {
  output: T;
  confidence?: number;
  warnings: string[];
  evidence: EvidenceRef[];
  provenance: Provenance;
};
```

Agents cannot publish.

Agents cannot bypass policy.

Agents communicate through canonical objects/events, not hidden shared memory.

---

# 12. Event Bus

## Event Naming

```text
content.created
content.generated
content.version.created
content.qa.passed
content.qa.failed
content.approved
content.rejected
content.scheduled
content.published
content.publish.failed
analytics.captured
experiment.completed
```

## Event Envelope

```json
{
  "eventId": "evt_...",
  "eventType": "content.approved",
  "eventVersion": 1,
  "occurredAt": "ISO-8601",
  "workspaceId": "ws_...",
  "objectId": "cnt_...",
  "actor": {},
  "traceId": "trace_...",
  "payload": {}
}
```

Initial implementation may use Redis Streams.

The contract must permit migration to Kafka/NATS later.

---

# 13. Queue Architecture

Queues:

```text
generation.caption
generation.image-prompt
generation.flow
generation.asset
qa.content
qa.brand
publishing.meta
analytics.meta
notifications
dead-letter
```

Requirements:

- retries with exponential backoff;
- idempotency keys;
- dead-letter queue;
- trace propagation;
- job timeout;
- concurrency controls;
- provider rate-limit handling.

---

# 14. REST API — Initial Contract

```text
POST   /v1/content
GET    /v1/content
GET    /v1/content/:id
POST   /v1/content/:id/generate
POST   /v1/content/:id/review
POST   /v1/content/:id/approve
POST   /v1/content/:id/reject
POST   /v1/content/:id/schedule
POST   /v1/content/:id/publish

GET    /v1/teachers
GET    /v1/teachers/:id

GET    /v1/campaigns
POST   /v1/campaigns

GET    /v1/prompts
POST   /v1/prompts/:key/execute

GET    /v1/analytics/content/:id
GET    /v1/audit
```

All write operations require:

- authenticated actor;
- workspace;
- authorization;
- idempotency key where appropriate;
- audit entry.

---

# 15. Adapter Interfaces

## AI Provider

```ts
interface TextGenerationAdapter {
  generate(request: TextGenerationRequest): Promise<TextGenerationResult>;
}
```

## Media Generation

```ts
interface MediaGenerationAdapter {
  submit(request: MediaGenerationRequest): Promise<GenerationJob>;
  getStatus(jobId: string): Promise<GenerationStatus>;
}
```

## Publishing

```ts
interface PublishingAdapter {
  validate(asset: PublishableContent): Promise<ValidationResult>;
  publish(asset: PublishableContent): Promise<PublishResult>;
}
```

## Storage

```ts
interface AssetStorageAdapter {
  put(file: Buffer, meta: AssetMetadata): Promise<StoredAsset>;
  getSignedUrl(key: string): Promise<string>;
  delete(key: string): Promise<void>;
}
```

---

# 16. Brand Guardian

Brand Guardian evaluates every asset against canonical brand configuration.

## Mandatory Rules

- Facebook graphics default to 1080 × 1350 unless overridden.
- Official Riwaq Al Ilm logo required on final publication assets.
- Emerald / gold / cream visual system.
- Red heart ❤️ rather than white heart when a heart is used.
- Teacher-related content uses approved real teacher photography where available.
- Teacher credentials come from canonical teacher records.
- Typography must match the approved website-derived typography configuration.
- No AI-invented credentials.
- No synthetic testimonial.
- No fabricated enrollment statistics.

Brand Guardian produces a scored report plus blocking violations.

---

# 17. Islamic Content Verification Layer

Any content containing Quran, hadith, dua, fiqh claims, Arabic religious text, or attribution is flagged for verification.

## Rules

- preserve Arabic carefully;
- verify ayah references;
- distinguish Quranic dua from non-Quranic supplication;
- do not describe popularity rankings as authoritative religious rankings;
- hadith claims require source attribution;
- avoid invented virtue claims;
- verify transliteration when included.

High-risk religious content requires Islamic Reviewer approval before publishing.

---

# 18. Content Versioning

Content versions are immutable.

Example:

```text
CNT-001 v1 — AI draft
CNT-001 v2 — editor revision
CNT-001 v3 — Islamic reviewer correction
CNT-001 v4 — final approved publication
```

Each version retains:

- previous version ID;
- editor/agent;
- diff summary;
- provenance;
- approval relationship.

---

# 19. Audit System

Every sensitive action emits an immutable `AuditEvent`.

Audit:

- content edits;
- prompt edits;
- approval decisions;
- role changes;
- teacher-record changes;
- publishing actions;
- policy overrides;
- token/connector changes.

No hard deletion of audit history.

---

# 20. Multi-Tenant Readiness

Version 9 remains optimized for Riwaq Al Ilm but must support future academies.

Every tenant-owned table includes `workspaceId`.

Security rules:

- no cross-workspace queries;
- workspace-scoped object storage;
- workspace-scoped API authorization;
- tenant-aware queues;
- tenant-aware secrets.

Do not implement complex billing in V9.

---

# 21. Environment Variables

```env
DATABASE_URL=
REDIS_URL=

AUTH_SECRET=
APP_BASE_URL=

OPENAI_API_KEY=

META_APP_ID=
META_APP_SECRET=
META_PAGE_ID=
META_PAGE_ACCESS_TOKEN=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=

GOOGLE_FLOW_ADAPTER_MODE=manual

SENTRY_DSN=
```

Secrets must never be prefixed `NEXT_PUBLIC_`.

---

# 22. Docker Compose — Development

```yaml
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_USER: riwaq
      POSTGRES_PASSWORD: riwaq
      POSTGRES_DB: media_kernel
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

Application services should run locally through `pnpm dev` during normal development.

---

# 23. Portal Screens

## Dashboard

- content due today;
- approval backlog;
- scheduled posts;
- recent performance;
- blocked objects.

## Content Studio

- content brief;
- caption;
- image prompt;
- Flow prompt;
- platform variants;
- version history;
- provenance.

## Approval Center

- compare versions;
- policy warnings;
- approve;
- request changes;
- reject.

## Teacher Registry

- canonical biography;
- credentials;
- approved photos;
- authoritative source.

## Prompt Registry

- prompt versions;
- active/inactive status;
- test execution;
- rollback.

## Analytics

- reach;
- engagement;
- trial conversions;
- campaign comparisons;
- content-series performance.

---

# 24. Testing Strategy

## Unit

- policy rules;
- content lifecycle;
- RBAC;
- versioning;
- adapter contracts.

## Contract

- Meta adapter;
- storage adapter;
- AI providers;
- event envelopes.

## Integration

- generate → review → approve → schedule;
- failed provider retry;
- duplicate publish protection.

## E2E

```text
Create post
→ Generate variants
→ Run QA
→ Reviewer approves
→ Schedule
→ Publish through fake adapter
→ Ingest analytics
```

## Mandatory Policy Tests

- incorrect Quran Arabic must block;
- teacher without approved photo must block teacher publication;
- unapproved content cannot publish;
- revoked user cannot approve;
- publication retry must not create duplicate posts.

---

# 25. Observability

Minimum stack:

- structured JSON logs;
- trace IDs;
- error tracking;
- worker metrics;
- queue depth;
- generation latency;
- provider failure rate;
- publication success rate.

Key SLOs:

```text
Kernel API availability: 99.9%
Publish job duplication: 0 tolerated
Audit coverage: 100% sensitive mutations
Approval bypass: 0 tolerated
```

---

# 26. Security Model

- least privilege;
- encrypted secrets;
- server-side tokens;
- signed webhooks;
- CSRF protection;
- input schema validation;
- output escaping;
- rate limiting;
- secure media URLs;
- token rotation;
- dependency scanning.

Never expose Meta, AI, or storage secrets to browser code.

---

# 27. Human Approval Modes

## MODE A — Manual

All generated assets require explicit human approval.

## MODE B — Assisted

Low-risk generic educational assets may be batch-approved.

## MODE C — Governed Autonomous

Future-only.

Requires:

- approved content class;
- stable prompt;
- zero policy warnings;
- defined rollback;
- performance guardrails.

Version 9 launches in **MODE A**.

---

# 28. Implementation Phases

## MK-01 — Kernel Foundation

Build:

- monorepo;
- PostgreSQL;
- Prisma;
- Redis;
- identity;
- workspace;
- audit.

**Exit criteria:** Canonical objects can be created and versioned.

## MK-02 — Content Registry

Build:

- content lifecycle;
- versions;
- content types;
- provenance.

**Exit criteria:** Content can move safely from IDEA → REVIEW_PENDING.

## MK-03 — Prompt Runtime

Build:

- prompt registry;
- prompt versions;
- agent contract;
- provider abstraction;
- generation runs.

**Exit criteria:** A caption can be generated reproducibly.

## MK-04 — Governance

Build:

- policy engine;
- Brand Guardian;
- Islamic verification flags;
- approvals.

**Exit criteria:** Unapproved content cannot reach publishing.

## MK-05 — Asset Runtime

Build:

- R2 adapter;
- media assets;
- image/Flow prompt artifacts;
- approved reference assets.

**Exit criteria:** Assets are canonical and traceable.

## MK-06 — Scheduler & Publisher

Build:

- scheduler;
- publication records;
- Meta adapter;
- idempotency.

**Exit criteria:** Approved content can publish once and only once.

## MK-07 — Analytics

Build:

- analytics ingestion;
- snapshots;
- content performance.

**Exit criteria:** Published assets receive measurable performance records.

## MK-08 — Portal

Build:

- studio;
- approvals;
- teacher registry;
- analytics dashboard.

**Exit criteria:** Non-engineering users can operate the system.

## MK-09 — Hardening

Build:

- E2E tests;
- security review;
- observability;
- disaster recovery;
- release procedures.

**Exit criteria:** Production-readiness review passes.

---

# 29. Definition of Done — Version 9

Version 9 is complete only when:

- all content objects are canonical and versioned;
- all AI generations have provenance;
- RBAC is enforced server-side;
- religious-content rules can block unsafe publication;
- approved teacher data is authoritative;
- all publication paths require approval;
- Meta publishing is idempotent;
- audit events cover every sensitive action;
- workers support retries and DLQ;
- analytics can be linked to publications;
- core flows have automated tests;
- production secrets are isolated;
- deployment runbook exists.

---

# 30. Recommended Implementation Stack

```text
Language: TypeScript
Monorepo: pnpm + Turborepo
Frontend: Next.js
API: Next.js Route Handlers or Fastify service
ORM: Prisma
Database: PostgreSQL
Queue/Event Transport: Redis + BullMQ / Redis Streams
Storage: Cloudflare R2
Auth: Auth.js or enterprise-compatible identity adapter
Validation: Zod
Observability: OpenTelemetry + Sentry-compatible backend
Testing: Vitest + Playwright
Deployment:
  Portal/API → Vercel
  Workers → Railway/Fly.io
  DB → managed PostgreSQL
  Redis → managed Redis
```

---

# 31. CLAUDE.md Governance Header

```md
# Riwaq Media Kernel Engineering Contract

Before implementing any change:

1. Inspect existing architecture.
2. Identify impacted canonical objects.
3. Identify policy and security implications.
4. Propose the smallest compatible change.
5. Preserve version history.
6. Add or update tests.
7. Never bypass human approval.
8. Never invent teacher facts, Quran text, hadith references, testimonials, or platform results.
9. Never expose secrets.
10. Report gaps before expanding scope.

Architecture-first gates apply before each major implementation phase.
```

---

# 32. Version 9 Outcome

Version 9 establishes the **Media Kernel** as the governed source of truth and execution runtime beneath the Riwaq Al Ilm Media Operating System.

The next stage should no longer add conceptual scope.

It should implement the kernel incrementally through:

```text
MK-01 → MK-02 → MK-03 → MK-04 → MK-05
→ MK-06 → MK-07 → MK-08 → MK-09
```

Only after MK-09 passes production readiness should autonomous publishing be considered.
