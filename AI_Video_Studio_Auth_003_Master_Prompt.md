# AI Video Studio — Authentication, Authorization, and Tenant Onboarding Master Prompt

**Document ID:** AIVS-AUTH-003
**Version:** 0.1 (DRAFT — pending user review)
**Status:** Draft for approval; do not execute until approved
**Project:** Riwaq Al Ilm Enterprise AI Video Production Studio
**Depends on:** AIVS-ENV-001 (PASS), AIVS-FOUNDATION-002 (PASS 2026-07-14)
**Primary Objective:** Replace the `x-aivs-tenant` header stopgap with real
identities, sessions, per-tenant role-based authorization, and tenant
onboarding — so consent capture, publishing approval, and signed-URL issuance
can later hang off real, audited users.

---

## 1. Claude Operating Role

You are acting as a **Principal Software Architect, Backend Engineer,
Security Engineer, and Senior QA Automation Engineer**.

All ENV-001/FOUNDATION-002 non-negotiable rules remain in force, plus:

1. Work on branch `feature/aivs-auth-003-identity-tenancy`.
2. Schema changes only via Prisma migrations.
3. **No paid services.** Auth is fully self-hosted against local Postgres.
   Email delivery is stubbed locally (console/log transport); Resend adapter
   ships behind an interface, unused until user enables it.
4. Security first: hashed passwords (argon2id via the auth library's default),
   httpOnly/secure/sameSite session cookies, CSRF protection, login rate
   limiting, no secrets committed, gitleaks clean.
5. Child-media guardrail (baseline §10): access to `featuresMinor` assets and
   their signed URLs requires an explicit `child_media_reviewer` (or higher)
   role and is audit-logged (who, what, when).
6. Every API route that touches tenant data must resolve tenant membership
   from the session — the `x-aivs-tenant` header path is deleted, not merely
   deprecated.

## 2. Recommended stack (confirm at gate 0)

- **Better Auth** (self-hosted, TypeScript-first, Prisma adapter, active
  organization/multi-tenant plugin) as the auth core.
  - Alternative considered: Auth.js/NextAuth v5 (weaker first-class org/RBAC
    story); Supabase Auth (ties identity to a pending infra decision); Clerk
    (paid — excluded by rule 3).
- Database sessions (revocable, fits child-safety audit requirements) over
  stateless JWT.
- RBAC roles per tenant membership: `owner`, `admin`, `editor`,
  `child_media_reviewer`, `viewer`. MFA out of scope but schema-compatible.

## 3. Scope

### In scope

- **packages/auth:** Better Auth server config, Prisma schema extension
  (users, sessions, accounts, verifications, memberships/organizations,
  invitations), role helpers (`requireRole`, `requireChildMediaAccess`),
  audit-event writer.
- **Tenant onboarding:** authenticated user creates a tenant (becomes
  `owner`); owner/admin invites members by email with a role; invitation
  accept flow; dev seed gains a default owner user.
- **API protection (studio-web):** session middleware on all `/api/assets*`
  routes; tenant resolved from active membership; role checks (upload/
  reprocess = editor+, signed URLs for `featuresMinor` assets =
  child_media_reviewer+, archive = admin+). 401/403 semantics tested.
- **UI (minimal):** login, register, logout, tenant switcher, invite form,
  members list. Same bare styling as the assets page.
- **Audit log:** table + writes for login success/failure, invitation
  events, role changes, child-media asset access.
- **Rate limiting:** login + register endpoints (in-memory or Redis-backed).
- **Tests:** unit (role helpers, invitation state), integration (register →
  create tenant → invite → member uploads → viewer denied → child-media gate),
  e2e (register/login → upload → see asset; unauthorized access blocked).

### Out of scope (later modules)

- OAuth/social providers, SSO/SAML, MFA (schema-ready only)
- Production email (Resend adapter stubbed), password-reset email UX
  (dev: reset link surfaced in server log)
- Consent capture UX (still schema + gate), publishing approvals
- Production deployment of auth (Vercel env/domain wiring)

## 4. Execution Gates

- **Gate 0 — Design Review:** ADR-AIVS-003 (auth stack confirmation, session
  model, membership/RBAC schema, route-protection map, audit-event catalog).
  **Stop for user approval before code.**
- **Gate 1 — Schema:** auth + membership + audit migrations; seed owner user.
- **Gate 2 — Auth core:** packages/auth wired; register/login/logout/session
  works with tests.
- **Gate 3 — Tenancy:** onboarding, invitations, role helpers.
- **Gate 4 — API protection:** asset routes locked down; header path removed;
  child-media access gate live.
- **Gate 5 — UI:** login/register/members pages; assets page uses session.
- **Gate 6 — Validation:** full suites + `pnpm verify` green; evidence.
- **Gate 7 — Verification report** + next-module recommendation.

## 5. Definition of Done

- ADR-AIVS-003 approved before implementation
- Unauthenticated requests to any asset API → 401 (tested)
- Cross-tenant access attempts → 403/404 with audit trail (tested)
- `featuresMinor` signed URL requires `child_media_reviewer`+ and writes an
  audit row (tested)
- `x-aivs-tenant` header code fully removed
- Invitation flow works end-to-end locally without external email
- Full FOUNDATION-002 pipeline still green under authenticated sessions
- `pnpm verify` green; gitleaks clean; migrations reproducible
- Verification report complete; user approval requested before next module
