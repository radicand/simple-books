import '@tanstack/react-start/server-only'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { assertSafeStorageKey } from '~/lib/attachment-security'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const UPLOAD_DIR = resolve('./data/uploads')
const MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES ?? 10_485_760)

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

function localPath(storageKey: string): string {
  assertSafeStorageKey(storageKey)
  const path = resolve(UPLOAD_DIR, storageKey)
  if (!path.startsWith(UPLOAD_DIR + '/') && path !== UPLOAD_DIR) {
    throw new Error('Invalid storage path.')
  }
  return path
}

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
  if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
    throw new Error('Only JPEG, PNG, WebP, and PDF files are allowed.')
  }
}

export function detectMimeFromBytes(bytes: Uint8Array): AllowedMimeType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png'
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return 'application/pdf'
  }
  return null
}

export function validateUploadBytes(bytes: Uint8Array, declaredMime: string) {
  validateUpload(declaredMime, bytes.length)
  const detected = detectMimeFromBytes(bytes)
  if (!detected || detected !== declaredMime) {
    throw new Error('File content does not match declared type.')
  }
}

export async function putObject(
  storageKey: string,
  body: Uint8Array,
  mimeType: string,
): Promise<void> {
  assertSafeStorageKey(storageKey)
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
  const path = localPath(storageKey)
  mkdirSync(dirname(path), { recursive: true })
  await Bun.write(path, body)
}

export async function getObjectBytes(storageKey: string): Promise<Uint8Array> {
  assertSafeStorageKey(storageKey)
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
  const path = localPath(storageKey)
  const file = Bun.file(path)
  if (!(await file.exists())) throw new Error('Object not found.')
  return new Uint8Array(await file.arrayBuffer())
}

export async function deleteObject(storageKey: string): Promise<void> {
  assertSafeStorageKey(storageKey)
  if (s3Enabled()) {
    await s3Client().send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: storageKey,
      }),
    )
    return
  }
  const path = localPath(storageKey)
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
  assertSafeStorageKey(storageKey)
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
