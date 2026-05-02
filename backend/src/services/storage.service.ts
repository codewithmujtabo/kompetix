/**
 * Storage service — local file system for dev, swap to S3 for production.
 *
 * Files are saved to  backend/uploads/<userId>/<timestamp>-<sanitised-name>
 * and served by Express as static assets at  GET /uploads/<userId>/<filename>
 *
 * To migrate to S3: replace storeFile / deleteFile implementations and update
 * the returned URL to the S3 object URL. No other files need to change.
 */

import fs from "fs";
import path from "path";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

/** Ensure the per-user upload directory exists and return its absolute path. */
export function userUploadDir(userId: string): string {
  const dir = path.join(UPLOADS_ROOT, userId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Convert a stored file_url (relative path like /uploads/abc/file.pdf)
 * to an absolute filesystem path.
 */
export function urlToLocalPath(fileUrl: string): string {
  return path.join(process.cwd(), fileUrl);
}

/**
 * Delete a file by its stored URL. Silently ignores missing files.
 */
export function deleteLocalFile(fileUrl: string): void {
  try {
    const abs = urlToLocalPath(fileUrl);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch (err) {
    console.error("storage: failed to delete file", fileUrl, err);
  }
}
