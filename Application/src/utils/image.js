/**
 * Client-side downscaling for uploaded photos — disc images and user avatars.
 *
 * Purely a bandwidth optimisation — the server re-encodes every upload anyway
 * (WebP, capped per endpoint), so nothing here is a security or correctness
 * boundary. A 12MP phone photo is ~5MB; this ships ~200KB instead.
 *
 * Callers that need a different filename pass their own to FormData.append —
 * see the auth store's avatar upload.
 */

export const MAX_EDGE = 1600
export const QUALITY = 0.85

// Phone photos are usually stored upright + an EXIF orientation flag. Both
// paths below decode into an already-rotated bitmap — createImageBitmap is
// told to apply the flag, and <img> decoding applies it on its own — so the
// canvas never needs a manual transform (which would double-rotate).
async function decodeUpright(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Older WebViews reject the options bag, and some can't decode HEIC —
      // fall through to the <img> decoder, which handles both.
    }
  }
  return decodeViaImageElement(file)
}

function decodeViaImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('unsupported_image'))
    }
    img.src = url
  })
}

function encode(canvas, type, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality))
}

/**
 * Resizes an image file so its long edge is at most `MAX_EDGE` and re-encodes
 * it at ~q0.85. Returns the original file untouched if anything about the
 * decode/encode fails, or if re-encoding would not actually save bytes.
 */
export async function downscaleImage(file, { maxEdge = MAX_EDGE, quality = QUALITY } = {}) {
  let source
  try {
    source = await decodeUpright(file)
  } catch {
    return file
  }

  const width = source.width ?? source.naturalWidth
  const height = source.height ?? source.naturalHeight
  if (!width || !height) {
    source.close?.()
    return file
  }

  const scale = Math.min(1, maxEdge / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    source.close?.()
    return file
  }
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  source.close?.()

  // WebP first (smallest); Safari versions without WebP encoding hand back a
  // PNG or null, in which case JPEG is the portable fallback.
  let blob = await encode(canvas, 'image/webp', quality)
  if (!blob || blob.type !== 'image/webp') {
    blob = await encode(canvas, 'image/jpeg', quality)
  }
  if (!blob || blob.size >= file.size) return file

  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
  return new File([blob], `disc-image.${ext}`, { type: blob.type, lastModified: Date.now() })
}
