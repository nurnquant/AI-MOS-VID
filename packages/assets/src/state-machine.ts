/**
 * Asset lifecycle state machine (ADR-AIVS-002 §3). Every status change in
 * the system goes through transitionAsset — no direct status updates.
 */
import type { PrismaClient, Prisma } from "@aivs/database";
import { AssetStatus, TransitionActor } from "@aivs/database";

export const ALLOWED_TRANSITIONS: Readonly<Record<AssetStatus, readonly AssetStatus[]>> = {
  [AssetStatus.uploaded]: [AssetStatus.quarantined, AssetStatus.rejected],
  [AssetStatus.quarantined]: [AssetStatus.validating],
  [AssetStatus.validating]: [AssetStatus.ready, AssetStatus.rejected],
  [AssetStatus.ready]: [AssetStatus.archived],
  [AssetStatus.rejected]: [AssetStatus.validating],
  [AssetStatus.archived]: [],
};

export class IllegalTransitionError extends Error {
  readonly assetId: string;
  readonly from: AssetStatus;
  readonly to: AssetStatus;

  constructor(assetId: string, from: AssetStatus, to: AssetStatus) {
    super(`Illegal asset transition ${from} → ${to} for asset ${assetId}`);
    this.name = "IllegalTransitionError";
    this.assetId = assetId;
    this.from = from;
    this.to = to;
  }
}

export interface TransitionContext {
  actor: TransitionActor;
  reason?: string;
  jobId?: string;
  /** Extra asset fields to set atomically with the status change. */
  patch?: Prisma.AssetUpdateInput;
}

type PrismaLike = PrismaClient | Prisma.TransactionClient;

/**
 * Atomically move an asset to `to`, validate the edge against the current
 * status, write the audit row, and apply any extra field updates. Runs in
 * its own transaction unless given an existing transaction client.
 */
export async function transitionAsset(
  prisma: PrismaLike,
  assetId: string,
  to: AssetStatus,
  context: TransitionContext,
) {
  const run = async (tx: Prisma.TransactionClient) => {
    const asset = await tx.asset.findUniqueOrThrow({
      where: { id: assetId },
      select: { status: true },
    });
    if (!ALLOWED_TRANSITIONS[asset.status].includes(to)) {
      throw new IllegalTransitionError(assetId, asset.status, to);
    }
    const updated = await tx.asset.update({
      where: { id: assetId },
      data: { ...context.patch, status: to },
    });
    await tx.assetTransition.create({
      data: {
        assetId,
        fromStatus: asset.status,
        toStatus: to,
        reason: context.reason,
        actor: context.actor,
        jobId: context.jobId,
      },
    });
    return updated;
  };

  if ("$transaction" in prisma) {
    return prisma.$transaction(run);
  }
  return run(prisma);
}

/** Records the birth transition (∅ → uploaded) for a freshly created asset. */
export async function recordInitialTransition(
  prisma: PrismaLike,
  assetId: string,
  actor: TransitionActor,
): Promise<void> {
  await prisma.assetTransition.create({
    data: { assetId, fromStatus: null, toStatus: AssetStatus.uploaded, actor },
  });
}
