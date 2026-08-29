import { ref, readonly } from 'vue'
import { Preferences } from '@capacitor/preferences'

// Favorite discs are a purely on-device preference — there's no "favorite"
// concept on the backend, so this never touches the API. Persisted the same
// way the auth token is (see stores/auth.js): Capacitor Preferences, which
// survives app restarts and falls back to localStorage on web.
const FAVORITES_KEY = 'sd_favorite_discs'

const _favoriteIds = ref(new Set())
let _loadPromise = null

function loadFavorites() {
  if (!_loadPromise) {
    _loadPromise = Preferences.get({ key: FAVORITES_KEY }).then(({ value }) => {
      if (!value) return
      try {
        const ids = JSON.parse(value)
        if (Array.isArray(ids)) _favoriteIds.value = new Set(ids)
      } catch {
        // Corrupted/old value — start fresh rather than throwing.
      }
    })
  }
  return _loadPromise
}

function persist() {
  return Preferences.set({ key: FAVORITES_KEY, value: JSON.stringify([..._favoriteIds.value]) })
}

export function useFavorites() {
  // Fire-and-forget: favoriteIds is reactive, so once this resolves any
  // mounted component reading isFavorite()/favoriteIds re-renders on its own.
  loadFavorites()

  function isFavorite(discId) {
    return _favoriteIds.value.has(discId)
  }

  /** Flips a disc's local favorite flag and persists the change on-device. */
  async function toggleFavorite(discId) {
    await loadFavorites()
    if (_favoriteIds.value.has(discId)) {
      _favoriteIds.value.delete(discId)
    } else {
      _favoriteIds.value.add(discId)
    }
    await persist()
  }

  return {
    favoriteIds: readonly(_favoriteIds),
    isFavorite,
    toggleFavorite,
  }
}
