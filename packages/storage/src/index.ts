import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { list, put as blobPut } from "@vercel/blob";

export interface StorageAdapter {
  put(key: string, data: Buffer, contentType: string): Promise<string>;
  get(key: string): Promise<Buffer | null>;
  getUrl(key: string): string;
}

export function storageAssetUrl(key: string): string {
  return `/api/assets/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/** Writable path on Vercel serverless (/var/task is read-only). */
export function resolveLocalStoragePath(): string {
  if (process.env.LOCAL_STORAGE_PATH) {
    return process.env.LOCAL_STORAGE_PATH;
  }
  if (process.env.VERCEL) {
    return "/tmp/tbrpg-storage";
  }
  return path.join(process.cwd(), ".storage");
}

function resolveStorageDriver(): string {
  if (process.env.STORAGE_DRIVER) {
    return process.env.STORAGE_DRIVER;
  }
  if (process.env.VERCEL && process.env.BLOB_READ_WRITE_TOKEN) {
    return "blob";
  }
  return "local";
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private baseDir: string) {}

  private filePath(key: string) {
    return path.join(this.baseDir, key);
  }

  async put(key: string, data: Buffer, _contentType: string): Promise<string> {
    await mkdir(this.baseDir, { recursive: true });
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

export class VercelBlobStorageAdapter implements StorageAdapter {
  private readonly urls = new Map<string, string>();

  async put(key: string, data: Buffer, contentType: string): Promise<string> {
    const blob = await blobPut(key, data, {
      access: "public",
      contentType,
      addRandomSuffix: false,
    });
    this.urls.set(key, blob.url);
    return blob.url;
  }

  async get(key: string): Promise<Buffer | null> {
    const cached = this.urls.get(key);
    if (cached) {
      const res = await fetch(cached);
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    }

    const { blobs } = await list({ prefix: key, limit: 20 });
    const match = blobs.find((b) => b.pathname === key);
    if (!match) return null;

    this.urls.set(key, match.url);
    const res = await fetch(match.url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }

  getUrl(key: string): string {
    return this.urls.get(key) ?? storageAssetUrl(key);
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
  const driver = resolveStorageDriver();

  if (driver === "blob") {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn(
        "STORAGE_DRIVER=blob but BLOB_READ_WRITE_TOKEN is missing — falling back to local storage. " +
          "Create a Blob store in Vercel (Storage → Blob) to fix this.",
      );
      return new LocalStorageAdapter(resolveLocalStoragePath());
    }
    return new VercelBlobStorageAdapter();
  }

  if (driver === "s3") {
    return new S3StorageAdapter(process.env.S3_BUCKET ?? "tbrpg-assets", {
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? "us-east-1",
      accessKeyId: process.env.S3_ACCESS_KEY ?? "minioadmin",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "minioadmin",
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    });
  }

  return new LocalStorageAdapter(resolveLocalStoragePath());
}
