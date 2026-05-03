/**
 * Storage service — local disk (dev) or MinIO S3-compatible (production).
 *
 * When MINIO_ENDPOINT is set in .env, all file operations go through S3.
 * Otherwise, files are stored in backend/uploads/<userId>/ and served by Express.
 *
 * Callers use: storeFile, deleteFile, isS3Configured
 * Legacy local helpers still exported for any existing callers: userUploadDir, deleteLocalFile
 */

import fs from "fs";
import path from "path";
import { env } from "../config/env";

// ── S3 client (lazy-initialised) ─────────────────────────────────────────────

let s3Client: any = null;

function getS3Client() {
  if (s3Client) return s3Client;
  // Dynamic require so the module loads on Node 18+ without issues
  const { S3Client } = require("@aws-sdk/client-s3");
  s3Client = new S3Client({
    endpoint: env.MINIO_ENDPOINT,
    region: "us-east-1",
    credentials: {
      accessKeyId: env.MINIO_ACCESS_KEY,
      secretAccessKey: env.MINIO_SECRET_KEY,
    },
    forcePathStyle: true, // required for MinIO
  });
  return s3Client;
}

export function isS3Configured(): boolean {
  return !!(env.MINIO_ENDPOINT && env.MINIO_ACCESS_KEY && env.MINIO_SECRET_KEY);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Store a file buffer and return its public URL.
 * Dispatches to S3 (MinIO) or local disk depending on config.
 */
export async function storeFile(
  userId: string,
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  if (isS3Configured()) {
    return storeS3(userId, buffer, filename, mimeType);
  }
  return storeLocal(userId, buffer, filename);
}

/**
 * Delete a file by its stored URL. Silently ignores missing files.
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  if (isS3Configured()) {
    await deleteS3(fileUrl);
  } else {
    deleteLocalFile(fileUrl);
  }
}

// ── S3 / MinIO backend ────────────────────────────────────────────────────────

async function storeS3(
  userId: string,
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const { PutObjectCommand } = require("@aws-sdk/client-s3");
  const key = `uploads/${userId}/${filename}`;
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: env.MINIO_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );
  const base = (env.MINIO_PUBLIC_URL || env.MINIO_ENDPOINT).replace(/\/$/, "");
  return `${base}/${env.MINIO_BUCKET}/${key}`;
}

async function deleteS3(fileUrl: string): Promise<void> {
  try {
    const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
    // Extract key from URL: everything after /<bucket>/
    const marker = `/${env.MINIO_BUCKET}/`;
    const idx = fileUrl.indexOf(marker);
    if (idx === -1) return;
    const key = fileUrl.slice(idx + marker.length);
    await getS3Client().send(
      new DeleteObjectCommand({ Bucket: env.MINIO_BUCKET, Key: key })
    );
  } catch (err) {
    console.error("storage: failed to delete S3 object", fileUrl, err);
  }
}

// ── Local disk backend ────────────────────────────────────────────────────────

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

/** Ensure the per-user upload directory exists and return its absolute path. */
export function userUploadDir(userId: string): string {
  const dir = path.join(UPLOADS_ROOT, userId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function storeLocal(userId: string, buffer: Buffer, filename: string): Promise<string> {
  const dir = userUploadDir(userId);
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/uploads/${userId}/${filename}`;
}

export function urlToLocalPath(fileUrl: string): string {
  return path.join(process.cwd(), fileUrl);
}

export function deleteLocalFile(fileUrl: string): void {
  try {
    const abs = urlToLocalPath(fileUrl);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch (err) {
    console.error("storage: failed to delete file", fileUrl, err);
  }
}
