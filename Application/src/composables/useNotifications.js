import { ref, readonly, computed } from 'vue'
import { apiFetch } from '@/services/api'
import { useAuthStore, mapAuthError } from '@/stores/auth'
import { useI18n } from '@/i18n'

// Notifications come from the backend as { id, type, read, createdAt, data }
// where `createdAt` is a real ISO 8601 timestamp. `unreadCount` is derived
// straight from the fetched list (not a separate poll) so the inbox badge
// and the inbox list can never disagree with each other.
const _notifications = ref([])
const _notificationsLoading = ref(false)
const _notificationsError = ref(null)

function mapNotification(notification) {
  return {
    id: notification.id,
    type: notification.type,
    read: !!notification.read,
    createdAt: notification.createdAt,
    data: notification.data ?? {},
  }
}

/**
 * Buckets an ISO timestamp into a day label ('today' | 'yesterday' | a
 * localized date string) plus a localized clock time, so views can render
 * "Today" / "Yesterday" / "Jul 3" section headers without re-deriving the
 * locale logic themselves. Mirrors the day-grouping approach in
 * useDiscs.js's formatLastActive()/formatThrowTime(), but works off a real
 * Date instead of a canned {kind, ...} descriptor.
 */
export function bucketNotificationDate(createdAt, locale) {
  const date = new Date(createdAt)
  const now = new Date()

  const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86400000)

  const dayKey = dayDiff === 0 ? 'today' : dayDiff === 1 ? 'yesterday' : 'date'
  const dateLabel = dayKey === 'date'
    ? date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
    : null
  const clock = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })

  return { dayKey, dateLabel, clock, date }
}

export function useNotifications() {
  const authStore = useAuthStore()
  const { t } = useI18n()

  const unreadCount = computed(() => _notifications.value.filter(n => !n.read).length)

  /** Loads the signed-in user's notifications from the backend, newest first. */
  async function fetchNotifications() {
    _notificationsLoading.value = true
    _notificationsError.value = null
    try {
      const notifications = await apiFetch('/api/notifications', { token: authStore.token })
      _notifications.value = notifications.map(mapNotification)
    } catch (err) {
      _notificationsError.value = mapAuthError(err, t)
      throw err
    } finally {
      _notificationsLoading.value = false
    }
  }

  /** Optimistically marks a single notification read; reverts on failure. */
  async function markRead(id) {
    const target = _notifications.value.find(n => n.id === id)
    if (!target || target.read) return

    target.read = true
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'POST', token: authStore.token })
    } catch (err) {
      target.read = false
      throw err
    }
  }

  /** Optimistically marks every notification read; reverts on failure. */
  async function markAllRead() {
    const previouslyUnreadIds = _notifications.value.filter(n => !n.read).map(n => n.id)
    if (previouslyUnreadIds.length === 0) return

    _notifications.value.forEach(n => { n.read = true })
    try {
      await apiFetch('/api/notifications/read-all', { method: 'POST', token: authStore.token })
    } catch (err) {
      const revertSet = new Set(previouslyUnreadIds)
      _notifications.value.forEach(n => { if (revertSet.has(n.id)) n.read = false })
      throw err
    }
  }

  return {
    notifications: readonly(_notifications),
    notificationsLoading: readonly(_notificationsLoading),
    notificationsError: readonly(_notificationsError),
    unreadCount,
    fetchNotifications,
    markRead,
    markAllRead,
  }
}
