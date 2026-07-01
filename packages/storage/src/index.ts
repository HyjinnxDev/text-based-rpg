import { mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

export interface StorageAdapter {
  put(key: string, data: Buffer, contentType: string): Promise<string>;
  getUrl(key: string): string;
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private baseDir: string) {}

  async put(key: string, data: Buffer, _contentType: string): Promise<string> {
    const filePath = path.join(this.baseDir, key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
    return `/storage/${key}`;
  }

  getUrl(key: string): string {
    return `/storage/${key}`;
  }
}

export class S3StorageAdapter implements StorageAdapter {
  private client: S3Client;
  constructor(
    private bucket: string,
    config: {
      endpoint?: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      forcePathStyle?: boolean;
    },
  ) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle ?? true,
    });
  }

  async put(key: string, data: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );
    return this.getUrl(key);
  }

  getUrl(key: string): string {
    const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
    return `${endpoint}/${this.bucket}/${key}`;
  }

  async get(key: string): Promise<Buffer> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const bytes = await res.Body?.transformToByteArray();
    return Buffer.from(bytes ?? []);
  }
}

export function createStorageFromEnv(): StorageAdapter {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "s3") {
    return new S3StorageAdapter(process.env.S3_BUCKET ?? "tbrpg-assets", {
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? "us-east-1",
      accessKeyId: process.env.S3_ACCESS_KEY ?? "minioadmin",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "minioadmin",
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    });
  }
  return new LocalStorageAdapter(
    process.env.LOCAL_STORAGE_PATH ?? path.join(process.cwd(), ".storage"),
  );
}
