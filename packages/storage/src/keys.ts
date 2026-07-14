/**
 * Storage key scheme (ADR-AIVS-002 §4). Keys are always generated
 * server-side — original filenames never appear in keys.
 *
 *   quarantine/tenant/{tenantId}/project/{projectId}/asset/{assetId}/{uuid}.{ext}
 *   assets/tenant/{tenantId}/project/{projectId}/asset/{assetId}/{versionId}.{ext}
 */

export const STORAGE_PREFIXES = {
  quarantine: "quarantine",
  assets: "assets",
  exports: "exports",
  public: "public",
} as const;

export type StoragePrefix = keyof typeof STORAGE_PREFIXES;

export interface AssetKeyParts {
  tenantId: string;
  projectId: string;
  assetId: string;
  objectId: string;
  /** Extension derived from the DETECTED content type, never client input. */
  ext: string;
}

export function buildAssetKey(prefix: StoragePrefix, parts: AssetKeyParts): string {
  const { tenantId, projectId, assetId, objectId, ext } = parts;
  for (const [name, value] of Object.entries({ tenantId, projectId, assetId, objectId, ext })) {
    if (!/^[A-Za-z0-9-]+$/.test(value)) {
      throw new Error(`Invalid storage key part ${name}: ${JSON.stringify(value)}`);
    }
  }
  return `${STORAGE_PREFIXES[prefix]}/tenant/${tenantId}/project/${projectId}/asset/${assetId}/${objectId}.${ext}`;
}

export function isQuarantineKey(key: string): boolean {
  return key.startsWith(`${STORAGE_PREFIXES.quarantine}/`);
}

/** Every key must be namespaced under the given tenant. */
export function keyBelongsToTenant(key: string, tenantId: string): boolean {
  const [, ...rest] = key.split("/");
  return rest[0] === "tenant" && rest[1] === tenantId;
}
