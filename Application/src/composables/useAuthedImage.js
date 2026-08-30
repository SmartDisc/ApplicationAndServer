import { ref, toValue, watch, onUnmounted } from 'vue'
import { apiFetchBlob } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

/**
 * Loads any JWT-protected image URL as an object URL.
 *
 * A bare <img src="/api/..."> can't carry the Bearer token, so the bytes come
 * through the api layer and get bound as a blob URL instead. Object URLs are
 * refcounted per URL: a friends list and a disc member list showing the same
 * person share one fetch and one blob, and the blob is only revoked once
 * nothing on screen points at it.
 */

// Entries nobody is rendering any more are kept for a while so scrolling a
// list back up doesn't refetch. Bounded, or a long session leaks blobs.
const IDLE_LIMIT = 60

const cache = new Map()
const idle = []

function keyFor(token, url) {
  // Keyed by token too: after a sign-out/sign-in the old entries become
  // unreachable and age out instead of serving the previous user's photos.
  return `${token ?? ''}\n${url}`
}

function dispose(key) {
  const entry = cache.get(key)
  if (!entry) return
  // Marked before aborting so a fetch that resolves anyway revokes its own
  // blob instead of parking it on an entry that is no longer in the cache —
  // nothing would ever hold that URL again, and nothing would revoke it.
  entry.disposed = true
  entry.controller.abort()
  if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl)
  cache.delete(key)
}

function markActive(key) {
  const i = idle.indexOf(key)
  if (i !== -1) idle.splice(i, 1)
}

function markIdle(key) {
  markActive(key)
  idle.push(key)
  while (idle.length > IDLE_LIMIT) dispose(idle.shift())
}

function acquire(url, token) {
  const key = keyFor(token, url)
  let entry = cache.get(key)
  if (!entry) {
    entry = { key, refs: 0, objectUrl: null, failed: false, promise: null, disposed: false, controller: new AbortController() }
    // Only ever aborted from dispose(), which runs at refs === 0, so this
    // never cancels a fetch some other row is still waiting on.
    entry.promise = apiFetchBlob(url, { token, signal: entry.controller.signal })
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob)
        if (entry.disposed) URL.revokeObjectURL(objectUrl)
        else entry.objectUrl = objectUrl
      })
      // A 404 (no image) or an unreachable server is never fatal — the caller
      // falls back. Cached so a list of 40 rows doesn't retry 40 times; the
      // `?v=` cache-buster in the URL makes a replacement a different key.
      .catch(() => { entry.failed = true })
    cache.set(key, entry)
  }
  entry.refs++
  markActive(key)
  return entry
}

function release(entry) {
  if (!entry) return
  entry.refs = Math.max(0, entry.refs - 1)
  if (entry.refs === 0) markIdle(entry.key)
}

export function useAuthedImage(source) {
  const src = ref(null)
  const loading = ref(false)
  const failed = ref(false)

  let held = null
  // Guards against a fast list re-render resolving an older request last.
  let seq = 0

  function drop() {
    release(held)
    held = null
    src.value = null
  }

  async function load(url) {
    const id = ++seq
    drop()
    failed.value = false

    if (!url) {
      loading.value = false
      return
    }

    const entry = acquire(url, useAuthStore().token)
    held = entry

    // Already resolved: settle synchronously so a cached avatar never flashes
    // its initials on re-render.
    if (entry.objectUrl || entry.failed) {
      src.value = entry.objectUrl
      failed.value = entry.failed
      loading.value = false
      return
    }

    loading.value = true
    await entry.promise
    if (id !== seq) return
    src.value = entry.objectUrl
    failed.value = entry.failed
    loading.value = false
  }

  watch(() => toValue(source), url => { load(url) }, { immediate: true })

  onUnmounted(() => {
    seq++
    drop()
  })

  return { src, loading, failed }
}
