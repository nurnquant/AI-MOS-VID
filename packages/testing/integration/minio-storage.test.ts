import { describe, expect, it } from "vitest";
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
  region: process.env.S3_REGION ?? "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "aivs_local",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "aivs_local_secret",
  },
});

const BUCKET = process.env.S3_BUCKET ?? "aivs-assets";

describe("MinIO object storage (integration)", () => {
  it("creates bucket if needed, then uploads, downloads, and deletes an object", async () => {
    try {
      await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    } catch {
      await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
    }

    const key = `integration-test/hello-${process.pid}.txt`;
    const body = "aivs environment smoke object";

    await s3.send(
      new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: "text/plain" }),
    );

    const got = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const text = await got.Body?.transformToString();
    expect(text).toBe(body);

    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));

    await expect(s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))).rejects.toThrow();
  });
});
