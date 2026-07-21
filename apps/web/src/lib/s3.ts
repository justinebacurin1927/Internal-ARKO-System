import { S3Client } from '@aws-sdk/client-s3'

// Works with AWS S3 or any S3-compatible store (e.g. Supabase Storage) via S3_ENDPOINT.
export const s3 = new S3Client({
  region: process.env.S3_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
  ...(process.env.S3_ENDPOINT
    ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }
    : {}),
  ...(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        },
      }
    : {}),
})

export const S3_BUCKET = process.env.S3_BUCKET!
