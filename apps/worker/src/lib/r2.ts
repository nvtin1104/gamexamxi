import type { R2Bucket } from '@cloudflare/workers-types'

/**
 * Upload a file to R2
 */
export async function uploadToR2(
  bucket: R2Bucket,
  key: string,
  body: ArrayBuffer | ReadableStream,
  contentType: string,
): Promise<void> {
  await bucket.put(key, body, {
    httpMetadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
    },
  })
}

/**
 * Delete a file from R2
 */
export async function deleteFromR2(
  bucket: R2Bucket,
  key: string,
): Promise<void> {
  await bucket.delete(key)
}

/**
 * Construct a public URL for an R2 object via custom domain
 */
export function getR2PublicUrl(key: string, cdnDomain: string): string {
  const domain = cdnDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return `https://${domain}/${key}`
}

/**
 * Generate a structured R2 key: {category}/{ownerId}/{uuid}.{ext}
 */
export function generateUploadKey(
  category: string,
  ownerId: string,
  originalFilename: string,
): string {
  const ext = getExtension(originalFilename)
  const uuid = crypto.randomUUID()
  return `${category}/${ownerId}/${uuid}${ext ? `.${ext}` : ''}`
}

/**
 * Extract file extension from filename (lowercase, no dot)
 */
function getExtension(filename: string): string {
  const parts = filename.split('.')
  if (parts.length < 2) return ''
  return parts.pop()!.toLowerCase()
}

/**
 * Map MIME type to a canonical extension (fallback when filename has none)
 */
export function mimeToExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'application/pdf': 'pdf',
  }
  return map[mimeType] ?? ''
}
