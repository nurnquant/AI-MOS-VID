/**
 * Mock publishing provider (ADR-AIVS-008 §4): deterministic external ids,
 * zero network. A caption containing "[force-failure]" fails — deliberate
 * hook for testing the failure path end-to-end.
 */
import type { PublishRequest, PublishingProvider, ProviderJobStatus } from "./contracts.ts";

function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

export class MockPublishingProvider implements PublishingProvider {
  readonly name = "mock-publishing";

  async publish(
    request: PublishRequest,
  ): Promise<{ publicationId: string; status: ProviderJobStatus }> {
    if (request.caption.includes("[force-failure]")) {
      return { publicationId: "", status: "failed" };
    }
    const hash = fnv1a(`${request.platform}:${request.assetKey}`).toString(16);
    return { publicationId: `mock-${request.platform}-${hash}`, status: "succeeded" };
  }
}
