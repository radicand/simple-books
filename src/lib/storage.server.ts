import '@tanstack/react-start/server-only'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const UPLOAD_DIR = './data/uploads'
const MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES ?? 10_485_760)

const ALLOWED_PREFIXES = ['image/', 'application/pdf']

function s3Enabled() {
  return !!process.env.S3_ENDPOINT?.trim() && !!process.env.S3_BUCKET?.trim()
}

function s3Client() {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'garage',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || '',
      secretAccessKey: process.env.S3_SECRET_KEY || '',
    },
    forcePathStyle: true,
  })
}

export function validateUpload(mimeType: string, sizeBytes: number) {
  if (sizeBytes <= 0) throw new Error('Empty file.')
  if (sizeBytes > MAX_BYTES) {
    throw new Error(`File exceeds ${Math.round(MAX_BYTES / 1_048_576)}MB limit.`)
  }
  if (!ALLOWED_PREFIXES.some((p) => mimeType.startsWith(p))) {
    throw new Error('Only images and PDF files are allowed.')
  }
}

export async function putObject(
  storageKey: string,
  body: Uint8Array,
  mimeType: string,
): Promise<void> {
  if (s3Enabled()) {
    await s3Client().send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: storageKey,
        Body: body,
        ContentType: mimeType,
      }),
    )
    return
  }
  const path = join(UPLOAD_DIR, storageKey)
  mkdirSync(dirname(path), { recursive: true })
  await Bun.write(path, body)
}

export async function getObjectBytes(storageKey: string): Promise<Uint8Array> {
  if (s3Enabled()) {
    const res = await s3Client().send(
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: storageKey,
      }),
    )
    const bytes = await res.Body?.transformToByteArray()
    if (!bytes) throw new Error('Object not found.')
    return bytes
  }
  const path = join(UPLOAD_DIR, storageKey)
  const file = Bun.file(path)
  if (!(await file.exists())) throw new Error('Object not found.')
  return new Uint8Array(await file.arrayBuffer())
}

export async function deleteObject(storageKey: string): Promise<void> {
  if (s3Enabled()) {
    await s3Client().send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: storageKey,
      }),
    )
    return
  }
  const path = join(UPLOAD_DIR, storageKey)
  try {
    const { unlink } = await import('node:fs/promises')
    await unlink(path)
  } catch {
    /* ignore missing */
  }
}

export async function presignedGetUrl(
  storageKey: string,
  expiresIn = 3600,
): Promise<string | null> {
  if (!s3Enabled()) return null
  return getSignedUrl(
    s3Client(),
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: storageKey,
    }),
    { expiresIn },
  )
}

export { s3Enabled, MAX_BYTES as uploadMaxBytes }
