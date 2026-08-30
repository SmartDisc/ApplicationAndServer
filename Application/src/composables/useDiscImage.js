import { useAuthedImage } from '@/composables/useAuthedImage'

// Disc images are behind the same JWT as every other endpoint, so a bare
// <img src="/api/discs/{id}/image"> would come back 401 — the WebView doesn't
// attach the Bearer token. That object-URL lifecycle is shared with user
// avatars now, so it lives in useAuthedImage; this stays as the disc-facing
// name for it. Same { src, loading, failed } shape as before, plus a
// URL-keyed cache so a re-rendered list doesn't refetch.
export function useDiscImage(source) {
  return useAuthedImage(source)
}
