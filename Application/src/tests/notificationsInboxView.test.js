// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

// Mock the data layer at the lowest safe boundary: apiFetch. useNotifications()
// and useFriends() run their real logic against these fake HTTP responses, so
// the test exercises the real composables + the real template.
vi.mock('@/services/api', () => {
  class ApiError extends Error {
    constructor(message, { status = null, fieldErrors = null, retryAfter = null } = {}) {
      super(message)
      this.name = 'ApiError'
      this.status = status
      this.fieldErrors = fieldErrors
      this.retryAfter = retryAfter
    }
  }
  return { apiFetch: vi.fn(), ApiError }
})

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async () => ({ value: null })),
    set: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
  },
}))

import { apiFetch } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import NotificationsInboxView from '@/views/NotificationsInboxView.vue'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/notifications', component: { template: '<div />' } },
      { path: '/friends', component: { template: '<div />' } },
    ],
  })
}

async function mountInboxView() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const authStore = useAuthStore()
  authStore.token = 'test-token'

  const router = makeRouter()
  await router.push('/notifications')
  await router.isReady()

  const wrapper = mount(NotificationsInboxView, {
    global: { plugins: [pinia, router] },
  })
  await flushPromises()
  return wrapper
}

describe('NotificationsInboxView — accepting a friend_request notification inline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('swaps the accept/decline buttons for a "Handled" label, and leaves a different pending request untouched', async () => {
    const notifications = [
      {
        id: 1,
        type: 'friend_request',
        read: true,
        createdAt: '2026-07-13T09:00:00Z',
        data: { fromName: 'Priya Shah', friendshipId: 701 },
      },
      {
        id: 2,
        type: 'friend_request',
        read: true,
        createdAt: '2026-07-13T08:00:00Z',
        data: { fromName: 'Sam Lee', friendshipId: 702 },
      },
    ]

    apiFetch.mockImplementation(async (path, opts = {}) => {
      const method = opts.method ?? 'GET'
      if (path === '/api/notifications' && method === 'GET') return notifications
      if (path === '/api/friends' && method === 'GET') return []
      // The view now loads the real pending lists on mount so it can gate the
      // accept/decline buttons on true friendship/invitation state. Both
      // friend_request notifications above are still pending here.
      if (path === '/api/friends/requests' && method === 'GET') {
        return [
          { id: 701, fromUserId: 11, fromName: 'Priya Shah', fromEmail: 'priya@example.com', createdAt: '2026-07-13T09:00:00Z' },
          { id: 702, fromUserId: 12, fromName: 'Sam Lee', fromEmail: 'sam@example.com', createdAt: '2026-07-13T08:00:00Z' },
        ]
      }
      if (path === '/api/disc-invitations' && method === 'GET') return []
      if (path === '/api/friends/requests/701/accept' && method === 'POST') return { ok: true }
      throw new Error(`Unexpected apiFetch call: ${method} ${path}`)
    })

    const wrapper = await mountInboxView()

    const rows = wrapper.findAll('.notif')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Priya Shah')
    expect(rows[1].text()).toContain('Sam Lee')

    // Both pending friend_request notifications start with an accept/decline pair.
    expect(rows[0].find('.notif__actions').exists()).toBe(true)
    expect(rows[0].find('.notif-action--accept').exists()).toBe(true)
    expect(rows[0].find('.notif-action--decline').exists()).toBe(true)
    expect(rows[1].find('.notif__actions').exists()).toBe(true)

    await rows[0].find('.notif-action--accept').trigger('click')
    await flushPromises()

    const rowsAfter = wrapper.findAll('.notif')

    // Priya's row: buttons are gone, replaced by the resolved label. The row
    // itself is NOT removed from the list.
    expect(rowsAfter[0].text()).toContain('Priya Shah')
    expect(rowsAfter[0].find('.notif__actions').exists()).toBe(false)
    expect(rowsAfter[0].find('.notif-action--accept').exists()).toBe(false)
    expect(rowsAfter[0].find('.notif-action--decline').exists()).toBe(false)
    expect(rowsAfter[0].find('.notif__resolved').exists()).toBe(true)
    expect(rowsAfter[0].find('.notif__resolved').text()).toBe('Handled')

    // Sam's still-pending request is completely untouched.
    expect(rowsAfter[1].text()).toContain('Sam Lee')
    expect(rowsAfter[1].find('.notif__actions').exists()).toBe(true)
    expect(rowsAfter[1].find('.notif-action--accept').exists()).toBe(true)
    expect(rowsAfter[1].find('.notif-action--decline').exists()).toBe(true)
    expect(rowsAfter[1].find('.notif__resolved').exists()).toBe(false)

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/friends/requests/701/accept',
      expect.objectContaining({ method: 'POST', token: 'test-token' }),
    )
  })
})
