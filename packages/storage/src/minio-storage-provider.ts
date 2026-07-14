import { Readable } from "node:stream";
import {
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageProvider } from "@aivs/providers";

export interface MinioStorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

export function storageConfigFromEnv(env: NodeJS.ProcessEnv = process.env): MinioStorageConfig {
  const required = (name: string): string => {
    const value = env[name];
    if (!value) throw new Error(`Missing required env var ${name}`);
    return value;
  };
  return {
    endpoint: required("S3_ENDPOINT"),
    region: env.S3_REGION ?? "us-east-1",
    bucket: required("S3_BUCKET"),
    accessKeyId: required("S3_ACCESS_KEY_ID"),
    secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
    forcePathStyle: (env.S3_FORCE_PATH_STYLE ?? "true") === "true",
  };
}

export const SIGNED_URL_DEFAULT_TTL_SECONDS = 15 * 60;
export const SIGNED_URL_MAX_TTL_SECONDS = 24 * 60 * 60;

/**
 * S3-compatible storage against local MinIO (path-style). Production swaps
 * endpoint/credentials env vars for R2/S3 — no code change.
 */
export class MinioStorageProvider implements StorageProvider {
  readonly name = "minio";
  readonly bucket: string;
  private readonly client: S3Client;

  constructor(config: MinioStorageConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async putObject(key: string, body: Uint8Array, contentType: string): Promise<{ key: string }> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
    return { key };
  }

  /** Streaming upload (multipart under the hood) for large media bodies. */
  async putObjectStream(
    key: string,
    body: Readable,
    contentType: string,
  ): Promise<{ key: string }> {
    const upload = new Upload({
      client: this.client,
      params: { Bucket: this.bucket, Key: key, Body: body, ContentType: contentType },
    });
    await upload.done();
    return { key };
  }

  async getObject(key: string): Promise<Uint8Array> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!response.Body) throw new Error(`Empty body for object ${key}`);
    return response.Body.transformToByteArray();
  }

  async getObjectStream(key: string): Promise<Readable> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!response.Body) throw new Error(`Empty body for object ${key}`);
    return response.Body as Readable;
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async copyObject(fromKey: string, toKey: string): Promise<void> {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `/${this.bucket}/${encodeURIComponent(fromKey).replaceAll("%2F", "/")}`,
        Key: toKey,
      }),
    );
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === "NotFound") return false;
      throw error;
    }
  }

  async objectSize(key: string): Promise<number> {
    const head = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
    return head.ContentLength ?? 0;
  }

  async getSignedUrl(
    key: string,
    expiresInSeconds: number = SIGNED_URL_DEFAULT_TTL_SECONDS,
  ): Promise<string> {
    const ttl = Math.min(expiresInSeconds, SIGNED_URL_MAX_TTL_SECONDS);
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: ttl,
    });
  }

  /** Local/dev convenience — production buckets are provisioned, not created here. */
  async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  destroy(): void {
    this.client.destroy();
  }
}
