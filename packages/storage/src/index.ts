import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

export interface StorageAdapter {
  put(key: string, data: Buffer, contentType: string): Promise<string>;
  get(key: string): Promise<Buffer | null>;
  getUrl(key: string): string;
}

export function storageAssetUrl(key: string): string {
  return `/api/assets/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private baseDir: string) {}

  private filePath(key: string) {
    return path.join(this.baseDir, key);
  }

  async put(key: string, data: Buffer, _contentType: string): Promise<string> {
    const filePath = this.filePath(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
    return storageAssetUrl(key);
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await readFile(this.filePath(key));
    } catch {
      return null;
    }
  }

  getUrl(key: string): string {
    return storageAssetUrl(key);
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
    const publicBase = process.env.S3_PUBLIC_URL;
    if (publicBase) {
      return `${publicBase.replace(/\/$/, "")}/${this.bucket}/${key}`;
    }
    return storageAssetUrl(key);
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const bytes = await res.Body?.transformToByteArray();
      return Buffer.from(bytes ?? []);
    } catch {
      return null;
    }
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
