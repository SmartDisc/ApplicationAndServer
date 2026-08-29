// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

// Mock the data layer at the lowest safe boundary: apiFetch. useFriends()
// runs its real logic (accept/decline/refetch) against these fake HTTP
// responses, so the test exercises the real composable + real template.
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
import FriendsView from '@/views/friends/FriendsView.vue'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/friends', component: { template: '<div />' } },
    ],
  })
}

async function mountFriendsView() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const authStore = useAuthStore()
  authStore.token = 'test-token'

  const router = makeRouter()
  await router.push('/friends')
  await router.isReady()

  const wrapper = mount(FriendsView, {
    global: { plugins: [pinia, router] },
  })
  await flushPromises()
  return wrapper
}

describe('FriendsView — accepting an incoming friend request', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('removes the request row (and its accept/decline buttons) and shows the friend with a single remove button', async () => {
    // "Server-side" state that the mock mutates when the accept endpoint is hit,
    // mirroring what a real backend would do.
    let requests = [
      {
        id: 501,
        fromUserId: 9,
        fromName: 'Priya Shah',
        fromEmail: 'priya@example.com',
        createdAt: '2026-07-01T00:00:00Z',
      },
    ]
    let friends = []

    apiFetch.mockImplementation(async (path, opts = {}) => {
      const method = opts.method ?? 'GET'
      if (path === '/api/friends' && method === 'GET') return friends
      if (path === '/api/friends/requests' && method === 'GET') return requests
      if (path === '/api/friends/requests/sent' && method === 'GET') return []
      if (path === '/api/friends/requests/501/accept' && method === 'POST') {
        requests = []
        friends = [{ friendshipId: 9001, id: 9, name: 'Priya Shah', email: 'priya@example.com' }]
        return { ok: true }
      }
      throw new Error(`Unexpected apiFetch call: ${method} ${path}`)
    })

    const wrapper = await mountFriendsView()

    // Before accepting: the incoming request row exists with BOTH an accept
    // and a decline button, and the friends list is still empty.
    expect(wrapper.text()).toContain('Priya Shah')
    expect(wrapper.find('.icon-action--accept').exists()).toBe(true)
    expect(wrapper.findAll('.icon-action--decline')).toHaveLength(1) // only the request row's decline
    expect(wrapper.text()).toContain('No friends yet')

    await wrapper.find('.icon-action--accept').trigger('click')
    await flushPromises()

    // After accepting: the ENTIRE request row (and thus its accept/decline
    // pair) is gone — not just the accept button.
    expect(wrapper.find('.icon-action--accept').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('No friends yet')

    // The "Incoming requests" section itself disappears (requests.length === 0).
    expect(wrapper.text()).not.toMatch(/Requests\s*·/)

    // The friend now shows up in "Your friends" with exactly ONE decline
    // (remove) icon button — no accept/decline pair.
    expect(wrapper.findAll('.icon-action--decline')).toHaveLength(1)
    expect(wrapper.find('.icon-action--decline').exists()).toBe(true)
    const listRows = wrapper.findAll('.sd-list-row')
    expect(listRows).toHaveLength(1)
    expect(listRows[0].text()).toContain('Priya Shah')
    expect(listRows[0].text()).toContain('priya@example.com')

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/friends/requests/501/accept',
      expect.objectContaining({ method: 'POST', token: 'test-token' }),
    )
  })

  it('keeps a second, still-pending request untouched when a different one is accepted', async () => {
    let requests = [
      { id: 501, fromUserId: 9, fromName: 'Priya Shah', fromEmail: 'priya@example.com', createdAt: '2026-07-01T00:00:00Z' },
      { id: 502, fromUserId: 11, fromName: 'Sam Lee', fromEmail: 'sam@example.com', createdAt: '2026-07-02T00:00:00Z' },
    ]
    let friends = []

    apiFetch.mockImplementation(async (path, opts = {}) => {
      const method = opts.method ?? 'GET'
      if (path === '/api/friends' && method === 'GET') return friends
      if (path === '/api/friends/requests' && method === 'GET') return requests
      if (path === '/api/friends/requests/sent' && method === 'GET') return []
      if (path === '/api/friends/requests/501/accept' && method === 'POST') {
        requests = requests.filter(r => r.id !== 501)
        friends = [{ friendshipId: 9001, id: 9, name: 'Priya Shah', email: 'priya@example.com' }]
        return { ok: true }
      }
      throw new Error(`Unexpected apiFetch call: ${method} ${path}`)
    })

    const wrapper = await mountFriendsView()

    expect(wrapper.findAll('.icon-action--accept')).toHaveLength(2)

    await wrapper.findAll('.icon-action--accept')[0].trigger('click')
    await flushPromises()

    // Priya's row is gone from "Incoming requests" (she now shows up as a
    // friend instead), Sam's row (with its own accept/decline pair) remains.
    expect(wrapper.findAll('.icon-action--accept')).toHaveLength(1)
    const remainingRequestRow = wrapper.findAll('.icon-action--accept')[0].element.closest('.sd-list-row')
    expect(remainingRequestRow.textContent).toContain('Sam Lee')
    expect(remainingRequestRow.textContent).not.toContain('Priya Shah')
  })
})
