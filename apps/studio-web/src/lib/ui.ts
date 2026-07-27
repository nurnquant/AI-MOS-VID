/** Shared status → badge-class mapping (UX-010 token palette). */

const BADGE: Record<string, string> = {
  // assets
  uploaded: "badge-muted",
  quarantined: "badge-warn",
  validating: "badge-info",
  ready: "badge-ok",
  rejected: "badge-danger",
  archived: "badge-muted",
  // consents
  active: "badge-ok",
  revoked: "badge-danger",
  expired: "badge-warn",
  // scripts + publications
  draft: "badge-muted",
  in_review: "badge-info",
  approved: "badge-ok",
  published: "badge-ok",
  failed: "badge-danger",
  retracted: "badge-danger",
  // generations
  running: "badge-info",
  succeeded: "badge-ok",
  partial: "badge-warn",
  queued: "badge-muted",
};

export function badgeClass(status: string): string {
  return `badge ${BADGE[status] ?? "badge-muted"}`;
}
