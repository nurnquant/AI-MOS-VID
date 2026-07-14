# AIVS Media Security Baseline

**Document ID:** AIVS-SEC-001
**Status:** Baseline for future implementation (documented in AIVS-ENV-001; enforced from AIVS-FOUNDATION-002 onward)

This system will process media featuring **children**. Child privacy, parental
consent, access control, retention, and publishing approval are first-class,
non-optional controls. No media feature ships without the relevant controls
below.

## 1. Allowed Media Types

| Kind  | Allowed containers/codecs                 | Notes                              |
| ----- | ----------------------------------------- | ---------------------------------- |
| Video | mp4 (h264/h265, aac), mov, webm (vp9/av1) | Everything else rejected at upload |
| Audio | mp3, aac, wav, flac                       |                                    |
| Image | jpeg, png, webp                           | No SVG (script injection surface)  |

## 2. Size Limits

- Video: 2 GB per file (raw uploads), 15 min max duration
- Audio: 200 MB
- Image: 25 MB
- Limits enforced server-side before the body is fully read (streaming check).

## 3. Filename and Path Sanitization

- Original filenames are never used as storage keys.
- Storage keys are generated UUIDs namespaced by tenant/project:
  `tenant/{tenantId}/project/{projectId}/asset/{uuid}.{ext}`.
- Original names stored as display metadata only, stripped of control
  characters and path separators.

## 4. Content-Type Verification

- Never trust the client `Content-Type` header.
- Sniff magic bytes AND validate with ffprobe/image decoding before accepting.
- Mismatch between claimed and detected type = reject + audit log.

## 5. Malware Scanning Boundary

- All uploads land in a **quarantine bucket/prefix** first.
- A scanning worker (ClamAV or provider-based) promotes clean files to the
  assets bucket; infected/unscannable files are deleted and logged.
- Nothing is served or processed from quarantine.

## 6. Object Storage Isolation

- Separate buckets/prefixes: `quarantine/`, `assets/`, `exports/`, `public/`.
- No public bucket ACLs in local or production. Public delivery only through
  signed URLs or a CDN with its own access controls.
- MinIO local credentials are dev-only; production uses IAM-scoped keys per
  service with least privilege.

## 7. Signed URL Strategy

- All asset reads use time-limited signed URLs (default 15 min, max 24 h for
  internal review links).
- Signed URLs for child media require an authenticated, authorized session at
  generation time and are never embedded in public pages.

## 8. Tenant Isolation

- Every asset, job, and export is scoped to a tenant ID.
- Queries and storage keys always filter/namespace by tenant; cross-tenant
  access is denied by default at the service layer.

## 9. Retention and Deletion

- Raw uploads: deleted after successful processing or 30 days, whichever first.
- Child-media assets: retention period set per parental consent record;
  hard-delete (object + metadata + derived assets) on expiry or revocation.
- Deletion requests (parent/guardian) honored within 30 days, including
  backups per backup-rotation policy.

## 10. Child Safety and Privacy Controls

- **Consent registry:** every asset featuring a minor links to a recorded,
  verifiable parental/guardian consent (scope: internal use vs publishing,
  platforms, expiry). No consent record → asset unusable.
- **Publishing approval:** two-step human approval (content reviewer +
  guardian-scope check) before any child media is published to any platform.
- **Access control:** child-media access restricted to explicitly granted
  roles; all access audit-logged (who, what, when, purpose).
- **No AI training / no third-party sharing** of child media without separate
  explicit consent.
- **Face/identity minimization:** prefer reusable consented assets; never
  generate synthetic depictions of real, identifiable children without
  documented guardian consent.
- **Regulatory alignment:** COPPA/GDPR-K style requirements treated as floor,
  not ceiling.

## 11. Enforcement Roadmap

| Control                                     | Phase                        |
| ------------------------------------------- | ---------------------------- |
| .env hygiene, secret scanning               | AIVS-ENV-001 (now)           |
| Upload validation, sanitization, quarantine | AIVS-FOUNDATION-002          |
| Consent registry + publishing approval      | Before any publishing module |
| Malware scanning worker                     | Before external uploads      |
| Tenant isolation                            | With authentication module   |
