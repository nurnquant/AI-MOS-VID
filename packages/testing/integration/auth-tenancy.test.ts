/**
 * AUTH-003 integration: registration, sessions, tenant onboarding,
 * invitations, RBAC guards, and the audited child-media signed-URL gate —
 * against live local Postgres/MinIO.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  AuthzError,
  acceptInvitation,
  createAuth,
  createTenant,
  inviteMember,
  requireMembership,
  type Auth,
  type EmailMessage,
  type EmailSender,
} from "@aivs/auth";
import {
  SignedUrlError,
  createAssetServices,
  closeAssetServices,
  issueAssetSignedUrl,
  type AssetServices,
} from "@aivs/assets";
import {
  AssetStatus,
  MediaKind,
  MembershipRole,
  VersionRole,
  createPrismaClient,
} from "@aivs/database";
import { MinioStorageProvider } from "@aivs/storage";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://aivs:aivs_local@localhost:5433/aivs";
process.env.REDIS_URL ??= "redis://localhost:6380";
process.env.BETTER_AUTH_SECRET ??= "aivs-integration-test-secret-000000000001";

const run = randomUUID().slice(0, 8);
const emailOutbox: EmailMessage[] = [];
const captureEmail: EmailSender = {
  name: "capture",
  async send(message) {
    emailOutbox.push(message);
  },
};

let services: AssetServices;
let auth: Auth;
let tenantId: string;

interface TestUser {
  id: string;
  email: string;
  headers: Headers;
}

async function registerAndLogin(label: string): Promise<TestUser> {
  const email = `${label}-${run}@it.riwaq.dev`;
  const password = `pw-${label}-${run}-000000`;
  await auth.api.signUpEmail({ body: { name: label, email, password } });
  const { headers } = await auth.api.signInEmail({
    body: { email, password },
    returnHeaders: true,
  });
  const setCookie = headers.get("set-cookie") ?? "";
  const cookie = setCookie.split(";")[0] ?? "";
  const user = await services.prisma.user.findUniqueOrThrow({ where: { email } });
  return { id: user.id, email, headers: new Headers({ cookie }) };
}

function withActiveTenant(user: TestUser, tenant: string): Headers {
  const headers = new Headers(user.headers);
  headers.set("cookie", `${headers.get("cookie")}; aivs_active_tenant=${tenant}`);
  return headers;
}

beforeAll(async () => {
  const prisma = createPrismaClient(DATABASE_URL);
  services = createAssetServices({
    prisma,
    storage: new MinioStorageProvider({
      endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
      region: "us-east-1",
      bucket: process.env.S3_BUCKET ?? "aivs-assets",
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "aivs_local",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "aivs_local_secret",
      forcePathStyle: true,
    }),
  });
  auth = createAuth({ prisma });
});

afterAll(async () => {
  const { prisma } = services;
  await prisma.auditEvent.deleteMany({ where: { tenantId } });
  await prisma.asset.deleteMany({ where: { tenantId } });
  await prisma.consentRecord.deleteMany({ where: { tenantId } });
  await prisma.project.deleteMany({ where: { tenantId } });
  await prisma.invitation.deleteMany({ where: { tenantId } });
  await prisma.membership.deleteMany({ where: { tenantId } });
  await prisma.tenant.deleteMany({ where: { id: tenantId } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${run}@it.riwaq.dev` } } });
  await closeAssetServices(services);
});

describe("registration, sessions, onboarding", () => {
  it("registers, signs in, and blocks members-less users at the guard", async () => {
    const founder = await registerAndLogin("founder");
    await expect(requireMembership(services.prisma, auth, founder.headers)).rejects.toMatchObject({
      status: 403,
    });

    const tenant = await createTenant(services.prisma, {
      userId: founder.id,
      name: `IT Workspace ${run}`,
      slug: `it-ws-${run}`,
    });
    tenantId = tenant.id;

    const context = await requireMembership(services.prisma, auth, founder.headers);
    expect(context.tenant.id).toBe(tenantId);
    expect(context.role).toBe(MembershipRole.owner);
  });

  it("rejects unauthenticated guards with 401", async () => {
    await expect(requireMembership(services.prisma, auth, new Headers())).rejects.toMatchObject({
      status: 401,
      name: "AuthzError",
    });
  });

  it("audits registration, login, and tenant creation", async () => {
    const types = (
      await services.prisma.auditEvent.findMany({
        where: { OR: [{ tenantId }, { user: { email: { endsWith: `-${run}@it.riwaq.dev` } } }] },
      })
    ).map((e) => e.type);
    expect(types).toContain("auth.register");
    expect(types).toContain("auth.login.success");
    expect(types).toContain("tenant.created");
  });
});

describe("invitations and RBAC", () => {
  let editor: TestUser;

  it("owner invites an editor; the invited email must match", async () => {
    const founder = await registerAndLogin("founder2");
    // founder2 is not a member — inviting requires admin+ via role arg.
    await expect(
      inviteMember(services.prisma, captureEmail, {
        tenantId,
        inviterUserId: founder.id,
        inviterRole: MembershipRole.editor,
        inviteeEmail: `editor-${run}@it.riwaq.dev`,
        role: MembershipRole.editor,
        baseUrl: "http://localhost:3000",
      }),
    ).rejects.toMatchObject({ status: 403 });

    const owner = await services.prisma.membership.findFirstOrThrow({
      where: { tenantId, role: MembershipRole.owner },
    });
    await inviteMember(services.prisma, captureEmail, {
      tenantId,
      inviterUserId: owner.userId,
      inviterRole: MembershipRole.owner,
      inviteeEmail: `editor-${run}@it.riwaq.dev`,
      role: MembershipRole.editor,
      baseUrl: "http://localhost:3000",
    });
    expect(emailOutbox.at(-1)?.to).toBe(`editor-${run}@it.riwaq.dev`);
    const token = emailOutbox.at(-1)!.text.match(/invite\/([0-9a-f]+)/)![1]!;

    const stranger = await registerAndLogin("stranger");
    await expect(
      acceptInvitation(services.prisma, {
        token,
        userId: stranger.id,
        userEmail: stranger.email,
      }),
    ).rejects.toMatchObject({ status: 403 });

    editor = await registerAndLogin("editor");
    const membership = await acceptInvitation(services.prisma, {
      token,
      userId: editor.id,
      userEmail: editor.email,
    });
    expect(membership.role).toBe(MembershipRole.editor);

    // Re-use is blocked.
    await expect(
      acceptInvitation(services.prisma, { token, userId: editor.id, userEmail: editor.email }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("enforces minimum roles at the guard", async () => {
    const headers = withActiveTenant(editor, tenantId);
    const asEditor = await requireMembership(services.prisma, auth, headers, MembershipRole.editor);
    expect(asEditor.role).toBe(MembershipRole.editor);
    await expect(
      requireMembership(services.prisma, auth, headers, MembershipRole.admin),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("child-media signed-URL gate", () => {
  it("denies below child_media_reviewer, audits and serves at or above", async () => {
    const { prisma, storage } = services;
    const project = await prisma.project.create({
      data: { tenantId, slug: `p-${run}`, name: "P" },
    });
    const storageKey = `assets/tenant/${tenantId}/project/${project.id}/asset/${randomUUID()}/${randomUUID()}.mp4`;
    await storage.ensureBucket();
    await storage.putObject(storageKey, new TextEncoder().encode("fake-ready-video"), "video/mp4");
    const asset = await prisma.asset.create({
      data: {
        tenantId,
        projectId: project.id,
        kind: MediaKind.video,
        status: AssetStatus.ready,
        displayName: "minor.mp4",
        claimedContentType: "video/mp4",
        detectedContentType: "video/mp4",
        sizeBytes: 16,
        checksumSha256: "0".repeat(64),
        storageKey,
        featuresMinor: true,
        versions: {
          create: {
            role: VersionRole.original,
            storageKey,
            contentType: "video/mp4",
            sizeBytes: 16,
          },
        },
      },
    });

    const someUser = await prisma.user.findFirstOrThrow({
      where: { email: `editor-${run}@it.riwaq.dev` },
    });
    await expect(
      issueAssetSignedUrl(services, {
        assetId: asset.id,
        tenantId,
        userId: someUser.id,
        role: MembershipRole.editor,
      }),
    ).rejects.toBeInstanceOf(AuthzError);

    const auditsBefore = await prisma.auditEvent.count({
      where: { type: "asset.child_media.url_issued", tenantId },
    });
    expect(auditsBefore).toBe(0);

    const issued = await issueAssetSignedUrl(services, {
      assetId: asset.id,
      tenantId,
      userId: someUser.id,
      role: MembershipRole.child_media_reviewer,
    });
    expect(issued.url).toContain("X-Amz-Signature");
    const audit = await prisma.auditEvent.findFirstOrThrow({
      where: { type: "asset.child_media.url_issued", tenantId },
    });
    expect(audit.detail).toMatchObject({ assetId: asset.id });

    await expect(
      issueAssetSignedUrl(services, {
        assetId: randomUUID(),
        tenantId,
        userId: someUser.id,
        role: MembershipRole.owner,
      }),
    ).rejects.toBeInstanceOf(SignedUrlError);

    await storage.deleteObject(storageKey).catch(() => {});
  });
});
