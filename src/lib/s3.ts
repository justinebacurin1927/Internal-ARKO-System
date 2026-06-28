import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Single storage interface for all uploads. Swapping MinIO <-> AWS S3 is
// purely an env change (see .env.example).
const bucket = process.env.S3_BUCKET ?? "arko-attachments";

export const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "us-east-1",
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
});

/** Presigned URL the browser uses to PUT a file directly to storage. */
export function presignUpload(key: string, contentType: string) {
  return getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    { expiresIn: 300 },
  );
}

/** Presigned URL to download/view an object. */
export function presignDownload(key: string) {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 300 },
  );
}

export function deleteObject(key: string) {
  return s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/** Build a unique object key for an upload. */
export function buildKey(fileName: string) {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${crypto.randomUUID()}-${safe}`;
}
