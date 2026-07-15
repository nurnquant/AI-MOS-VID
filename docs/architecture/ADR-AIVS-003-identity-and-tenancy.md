# ADR-AIVS-003 — Identity, Authorization, and Tenancy

**Status:** Accepted (user approved the AUTH-003 master prompt including the
recommended stack on 2026-07-15 and authorized implementation)
**Date:** 2026-07-15
**Deciders:** User + Claude Code
**Related:** ADR-AIVS-002, `docs/security/AIVS-media-security-baseline.md`,
`AI_Video_Studio_Auth_003_Master_Prompt.md`

## Context

FOUNDATION-002 shipped tenant-scoped assets with a `x-aivs-tenant` header
stopgap and no identities. Consent capture, publishing approval, and
signed-URL policy all require real, audited users. Constraints: self-hosted
only (no paid auth), local Postgres, child-media access must be role-gated
and audit-logged.

## Decision

### 1. Auth core: Better Auth (v1.6), email + password, database sessions

- `better-auth` with the Prisma adapter against the existing
  `packages/database` client; mounted in studio-web at `/api/auth/[...all]`.
- Email + password only this module (argon2-family hashing via library
  default; OAuth/MFA later — schema compatible).
- **Database sessions** (revocable; child-safety audits need server-side
  kill-switch) with httpOnly/sameSite=lax cookies. Built-in rate limiting
  enabled with tighter rules on sign-in/sign-up.
- Email delivery: `EmailSender` interface; local `ConsoleEmailSender` logs
  invitation/verification links. Resend adapter is a stub, unused.

### 2. Tenancy: custom membership on the existing Tenant table

Better Auth's organization plugin would introduce a parallel `Organization`
model duplicating our `Tenant` (already FK'd from every asset row). Instead:

- `Membership { userId, tenantId, role }` — unique per (user, tenant).
- `Invitation { tenantId, email, role, token, expiresAt, acceptedAt }` —
  token accept flow, link surfaced by the local email sender.
- Tenant creation = authenticated user creates Tenant + own `owner`
  membership in one transaction.
- Active tenant: `aivs_active_tenant` cookie set by the tenant switcher;
  falls back to the user's first membership. Every request re-validates the
  membership — the cookie only selects among the user's own tenants.

### 3. RBAC

Role hierarchy (each includes all rights below it):

| Role                   | Rights added                                            |
| ---------------------- | ------------------------------------------------------- |
| `owner`                | delete tenant (later), transfer ownership, role changes |
| `admin`                | invite/remove members, role changes below admin         |
| `child_media_reviewer` | access `featuresMinor` assets + their signed URLs       |
| `editor`               | upload, reprocess, normalize                            |
| `viewer`               | list/detail/status, signed URLs for non-minor assets    |

- Helpers in `packages/auth`: `requireSession`, `requireMembership(minRole)`,
  `canAccessChildMedia(role)`. Route map:
  - `GET /api/assets`, `GET /api/assets/{id}`, `/status` → viewer+
  - `POST /api/assets/upload`, `/reprocess` → editor+
  - `GET /api/assets/{id}/signed-url` → viewer+, **but `featuresMinor`
    assets require child_media_reviewer+** (baseline §7/§10)
  - membership management → admin+ (role changes capped at own level)
- `x-aivs-tenant` header path deleted. List endpoints additionally hide
  `featuresMinor` assets from roles below child_media_reviewer.

### 4. Audit log

`AuditEvent { id, tenantId?, userId?, type, detail Json, createdAt }`.
Event catalog this module: `auth.login.success`, `auth.login.failure`,
`auth.register`, `tenant.created`, `member.invited`, `member.joined`,
`member.role_changed`, `member.removed`, `asset.child_media.url_issued`.
Writes are best-effort (never block the primary action) except
`asset.child_media.url_issued`, which must commit before the URL is returned.

### 5. Package layout

- `packages/auth`: Better Auth server instance factory, Prisma schema
  additions live in `packages/database` (single schema file), role helpers,
  tenancy services (createTenant, invite, accept, members), audit writer,
  email sender interface + console/Resend-stub, dev seed (owner user).
- `apps/studio-web`: `/api/auth/[...all]` handler, auth client, login/
  register/members pages, tenant switcher, protected asset routes.

## Alternatives considered

| Area          | Alternative             | Why rejected                                   |
| ------------- | ----------------------- | ---------------------------------------------- |
| Auth core     | Auth.js (NextAuth v5)   | Weaker self-hosted email+password + RBAC story |
| Auth core     | Supabase Auth           | Couples identity to pending infra decision     |
| Auth core     | Clerk/WorkOS            | Paid — excluded by module rules                |
| Tenancy       | Better Auth org plugin  | Parallel Organization model duplicates Tenant  |
| Sessions      | Stateless JWT           | Not revocable; audit/kill-switch requirements  |
| Active tenant | Path prefix `/t/{slug}` | More routing churn than this module needs      |

## Consequences

- Prisma schema gains User/Session/Account/Verification (Better Auth shape)
  plus Membership/Invitation/AuditEvent; one migration.
- Asset API contracts change: 401 without session, 403 on missing role;
  integration/e2e suites updated to authenticate.
- Worker is unaffected (system actor, no session).
- Future consent-capture and publishing-approval modules get real actors and
  an audit substrate for free.

## Security implications

- Passwords hashed by Better Auth default (scrypt/argon2 family); sessions
  revocable server-side; cookies httpOnly + sameSite.
- Rate-limited sign-in/up; login failures audited.
- Child-media access is deny-by-default: below child_media_reviewer, those
  assets are invisible in lists and their signed URLs are 403.
- Local email sender prints links to server logs only — no external calls.
