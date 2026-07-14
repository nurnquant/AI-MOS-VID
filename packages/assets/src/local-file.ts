import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import type { MinioStorageProvider } from "@aivs/storage";

/** Downloads an object to a temp dir, runs fn, always cleans up. */
export async function withLocalCopy<T>(
  storage: MinioStorageProvider,
  key: string,
  fn: (localPath: string, workDir: string) => Promise<T>,
): Promise<T> {
  const workDir = await mkdtemp(join(tmpdir(), "aivs-worker-"));
  try {
    const ext = key.split(".").pop() ?? "bin";
    const localPath = join(workDir, `input.${ext}`);
    await pipeline(await storage.getObjectStream(key), createWriteStream(localPath));
    return await fn(localPath, workDir);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
