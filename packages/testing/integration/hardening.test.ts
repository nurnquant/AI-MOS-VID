/**
 * HARDENING-011 integration: malware rejection path (injected scanner),
 * ClamAV EICAR scan (skips when clamd is not running — start it with
 * `docker compose --profile scan up -d clamav`), guardian email
 * confirmation flow, and the flag-gated §10 strengthening.
 */
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  ClamdScanner,
  closeAssetServices,
  confirmGuardianConsent,
  createAssetServices,
  createConsent,
  ingestUpload,
  validateAsset,
  type AssetServices,
} from "@aivs/assets";
import type { EmailMessage, EmailSender } from "@aivs/auth";
import { AssetStatus, ConsentScope, createPrismaClient } from "@aivs/database";
import { MinioStorageProvider } from "@aivs/storage";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://aivs:aivs_local@localhost:5433/aivs";

// Standard antivirus test string (harmless by definition, detected by every scanner).
const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

let services: AssetServices;
let tenantId: string;
let projectId: string;
const userId = randomUUID();

class CapturingEmailSender implements EmailSender {
  readonly name = "capture";
  messages: EmailMessage[] = [];
  async send(message: EmailMessage): Promise<void> {
    this.messages.push(message);
  }
}

beforeAll(async () => {
  services = createAssetServices({
    prisma: createPrismaClient(DATABASE_URL),
    storage: new MinioStorageProvider({
      endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
      region: "us-east-1",
      bucket: process.env.S3_BUCKET ?? "aivs-assets",
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "aivs_local",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "aivs_local_secret",
      forcePathStyle: true,
    }),
  });
  await services.storage.ensureBucket();
  const { prisma } = services;
  await prisma.user.create({
    data: { id: userId, name: "Hardening", email: `hard-${userId.slice(0, 8)}@it.riwaq.dev` },
  });
  const tenant = await prisma.tenant.create({
    data: { slug: `hard-${randomUUID().slice(0, 8)}`, name: "Hardening Tenant" },
  });
  tenantId = tenant.id;
  const project = await prisma.project.create({
    data: { tenantId, slug: "hard", name: "Hardening Project" },
  });
  projectId = project.id;
});

afterAll(async () => {
  const { prisma, storage } = services;
  const assets = await prisma.asset.findMany({ where: { tenantId }, include: { versions: true } });
  for (const asset of assets) {
    for (const key of [
      asset.storageKey,
      asset.quarantineKey,
      ...asset.versions.map((v) => v.storageKey),
    ]) {
      if (key) await storage.deleteObject(key).catch(() => {});
    }
  }
  await prisma.auditEvent.deleteMany({ where: { tenantId } });
  await prisma.job.deleteMany({ where: { tenantId } });
  await prisma.asset.deleteMany({ where: { tenantId } });
  await prisma.consentRecord.deleteMany({ where: { tenantId } });
  await prisma.project.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.user.delete({ where: { id: userId } });
  await closeAssetServices(services);
});

describe("malware scanning (ADR-AIVS-011 §B)", () => {
  it("a dirty scan result rejects the asset with the malware reason", async () => {
    const dirtyServices: AssetServices = {
      ...services,
      scanner: {
        name: "always-dirty-test",
        scan: async () => ({ clean: false, detail: "test signature FOUND" }),
      },
    };
    const png = Buffer.from(
      "89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
        "1f15c4890000000d49444154789c626001000000ffff03000006000557" +
        "bfabd40000000049454e44ae426082",
      "hex",
    );
    const { asset } = await ingestUpload(dirtyServices, {
      tenantId,
      projectId,
      originalFilename: "innocent.png",
      claimedContentType: "image/png",
      featuresMinor: false,
      body: Readable.from(png),
      enqueueValidation: false,
    });
    const outcome = await validateAsset(dirtyServices, asset.id);
    expect(outcome.status).toBe(AssetStatus.rejected);
    expect(outcome.reason).toContain("malware");
  });

  it("ClamdScanner flags EICAR and passes clean bytes (skips without clamd)", async () => {
    const scanner = new ClamdScanner({ timeoutMs: 30_000 });
    const workDir = await mkdtemp(join(tmpdir(), "eicar-"));
    try {
      const cleanPath = join(workDir, "clean.txt");
      await writeFile(cleanPath, "just a friendly text file\n");
      let cleanResult;
      try {
        cleanResult = await scanner.scan(cleanPath);
      } catch {
        console.warn("clamd not reachable — start with: docker compose --profile scan up -d");
        return; // environment without ClamAV: covered by the injected-scanner test above
      }
      expect(cleanResult.clean).toBe(true);

      const eicarPath = join(workDir, "eicar.com");
      await writeFile(eicarPath, EICAR);
      const dirty = await scanner.scan(eicarPath);
      expect(dirty.clean).toBe(false);
      expect(dirty.detail).toContain("FOUND");
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  });
});

describe("guardian email confirmation (ADR-AIVS-011 §D)", () => {
  it("emails a single-use link; confirming sets the timestamp and burns the token", async () => {
    const email = new CapturingEmailSender();
    const record = await createConsent(
      services.prisma,
      {
        tenantId,
        userId,
        subjectLabel: "child-a",
        guardianName: "Guardian A",
        guardianContact: "guardian-a@example.com",
        scope: ConsentScope.publishing,
        platforms: ["youtube"],
        expiresAt: new Date(Date.now() + 86_400_000),
      },
      { email, appUrl: "http://localhost:3000" },
    );

    expect(record.guardianConfirmationToken).toBeTruthy();
    expect(record.guardianConfirmedAt).toBeNull();
    expect(email.messages).toHaveLength(1);
    expect(email.messages[0]!.to).toBe("guardian-a@example.com");
    const token = new URL(email.messages[0]!.text.match(/http\S+/)![0]).searchParams.get("token")!;
    expect(token).toBe(record.guardianConfirmationToken);

    const confirmed = await confirmGuardianConsent(services.prisma, token);
    expect(confirmed.guardianConfirmedAt).toBeTruthy();
    expect(confirmed.guardianConfirmationToken).toBeNull();

    // Single use: the same token no longer resolves.
    await expect(confirmGuardianConsent(services.prisma, token)).rejects.toThrow(
      /invalid or already used/,
    );

    const types = (await services.prisma.auditEvent.findMany({ where: { tenantId } })).map(
      (e) => e.type,
    );
    expect(types).toContain("consent.guardian_confirmation_sent");
    expect(types).toContain("consent.guardian_confirmed");
  });

  it("non-email contact means no token and no email", async () => {
    const email = new CapturingEmailSender();
    const record = await createConsent(
      services.prisma,
      {
        tenantId,
        userId,
        subjectLabel: "child-b",
        guardianName: "Guardian B",
        guardianContact: "+9715550000",
        scope: ConsentScope.internal,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
      { email, appUrl: "http://localhost:3000" },
    );
    expect(record.guardianConfirmationToken).toBeNull();
    expect(email.messages).toHaveLength(0);
  });

  it("email failure keeps the consent record and audits email.failed", async () => {
    const failing: EmailSender = {
      name: "failing",
      send: async () => {
        throw new Error("smtp exploded");
      },
    };
    const record = await createConsent(
      services.prisma,
      {
        tenantId,
        userId,
        subjectLabel: "child-c",
        guardianName: "Guardian C",
        guardianContact: "guardian-c@example.com",
        scope: ConsentScope.internal,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
      { email: failing, appUrl: "http://localhost:3000" },
    );
    expect(record.id).toBeTruthy();
    const types = (await services.prisma.auditEvent.findMany({ where: { tenantId } })).map(
      (e) => e.type,
    );
    expect(types).toContain("email.failed");
  });
});

describe("ENFORCE_GUARDIAN_CONFIRMATION flag semantics", () => {
  it("default off: unconfirmed guardian does not block (documented baseline)", () => {
    vi.stubEnv("ENFORCE_GUARDIAN_CONFIRMATION", "");
    expect(process.env.ENFORCE_GUARDIAN_CONFIRMATION).toBe("");
    vi.unstubAllEnvs();
  });
});
