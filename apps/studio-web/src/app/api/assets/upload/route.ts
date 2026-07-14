/**
 * POST /api/assets/upload — multipart upload, streamed into quarantine
 * with the byte cap enforced mid-stream (never buffers the whole body).
 * Metadata fields must precede the file part (standard form order).
 */
import { Readable } from "node:stream";
import Busboy from "busboy";
import { NextResponse, type NextRequest } from "next/server";
import { UploadTooLargeError, ingestUpload, type IngestResult } from "@aivs/assets";
import { z } from "zod";
import { serializeAsset } from "@/lib/serialize";
import { getServices } from "@/lib/services";
import { TenantNotFoundError, resolveTenant } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uploadFieldsSchema = z.object({
  projectId: z.uuid(),
  featuresMinor: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  consentRecordId: z.uuid().optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const services = getServices();
  let tenantId: string;
  try {
    tenantId = (await resolveTenant(request)).id;
  } catch (error) {
    if (error instanceof TenantNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data") || !request.body) {
    return NextResponse.json({ error: "multipart/form-data body required" }, { status: 400 });
  }

  try {
    const result = await new Promise<IngestResult>((resolve, reject) => {
      const busboy = Busboy({ headers: { "content-type": contentType } });
      const fields: Record<string, string> = {};
      let sawFile = false;

      busboy.on("field", (name, value) => {
        fields[name] = value;
      });

      busboy.on("file", (_name, fileStream, info) => {
        if (sawFile) {
          fileStream.resume();
          return;
        }
        sawFile = true;
        const parsed = uploadFieldsSchema.safeParse(fields);
        if (!parsed.success) {
          fileStream.resume();
          reject(Object.assign(new Error(z.prettifyError(parsed.error)), { statusCode: 400 }));
          return;
        }
        ingestUpload(services, {
          tenantId,
          projectId: parsed.data.projectId,
          originalFilename: info.filename || "untitled",
          claimedContentType: info.mimeType || "application/octet-stream",
          featuresMinor: parsed.data.featuresMinor,
          consentRecordId: parsed.data.consentRecordId,
          body: fileStream,
        })
          .then(resolve)
          .catch(reject);
      });

      busboy.on("error", reject);
      busboy.on("finish", () => {
        if (!sawFile) {
          reject(Object.assign(new Error("no file part in upload"), { statusCode: 400 }));
        }
      });

      Readable.fromWeb(request.body as import("stream/web").ReadableStream).pipe(busboy);
    });

    return NextResponse.json(
      { asset: serializeAsset(result.asset), validationJobId: result.validationJobId },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof UploadTooLargeError) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    const message = error instanceof Error ? error.message : "upload failed";
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
