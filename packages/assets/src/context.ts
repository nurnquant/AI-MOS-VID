/**
 * Service container — one place wires prisma, storage, and queues so app
 * routes, the worker, and tests share identical construction.
 */
import { getPrisma, type PrismaClient } from "@aivs/database";
import { MinioStorageProvider, storageConfigFromEnv } from "@aivs/storage";
import {
  QUEUES,
  createQueue,
  redisConnectionFromEnv,
  type ConsentEnforcementPayload,
  type MediaProcessingPayload,
  type ValidateAssetPayload,
} from "@aivs/queue";
import type { Queue } from "bullmq";
import { AlwaysPassScanner, type MalwareScanner } from "./scanner.ts";

export interface AssetServices {
  prisma: PrismaClient;
  storage: MinioStorageProvider;
  validationQueue: Queue<ValidateAssetPayload>;
  mediaQueue: Queue<MediaProcessingPayload>;
  enforcementQueue: Queue<ConsentEnforcementPayload>;
  scanner: MalwareScanner;
}

export function createAssetServices(overrides: Partial<AssetServices> = {}): AssetServices {
  const connection = redisConnectionFromEnv();
  return {
    prisma: overrides.prisma ?? getPrisma(),
    storage: overrides.storage ?? new MinioStorageProvider(storageConfigFromEnv()),
    validationQueue: overrides.validationQueue ?? createQueue(QUEUES.assetValidation, connection),
    mediaQueue: overrides.mediaQueue ?? createQueue(QUEUES.mediaProcessing, connection),
    enforcementQueue:
      overrides.enforcementQueue ?? createQueue(QUEUES.consentEnforcement, connection),
    scanner: overrides.scanner ?? new AlwaysPassScanner(),
  };
}

export async function closeAssetServices(services: AssetServices): Promise<void> {
  await services.validationQueue.close();
  await services.mediaQueue.close();
  await services.enforcementQueue.close();
  services.storage.destroy();
  await services.prisma.$disconnect();
}
