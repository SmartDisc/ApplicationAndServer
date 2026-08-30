// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

// Mock the data layer at apiFetch, like friendsView.test.js: useDiscs()/
// useThrows() run their real logic against these fake HTTP responses, so the
// test exercises the real composables + the real SearchView template.
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

// SdDiscImage pulls an authed <img> object-URL over apiFetch; stub it out so
// the disc-result rows render without hitting the image pipeline.
vi.mock('@/composables/useAuthedImage', async () => {
  const { ref } = await import('vue')
  return { useAuthedImage: () => ({ src: ref(null), loading: ref(false), failed: ref(false) }) }
})

import { apiFetch } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import SearchView from '@/views/SearchView.vue'

const OWNED = [
  { id: 'disc-sky', name: 'Sky Hucker', sharedCount: 0, hasImage: false, imageUrl: null },
  { id: 'disc-night', name: 'Night Owl', sharedCount: 0, hasImage: false, imageUrl: null },
]
const SHARED = [
  { id: 'disc-reds', name: 'Team Disc — Reds', ownerName: 'Alex', sharedCount: 1, hasImage: false, imageUrl: null },
]
const THROWS = {
  'disc-sky': [
    { id: 't1', discId: 'disc-sky', name: 'Long huck', isAutoNamed: false, recordedAt: '2026-08-30T14:21:00Z', durationMs: 3200, maxRpm: 1320, isFavorite: true },
  ],
  'disc-night': [
    { id: 't2', discId: 'disc-night', name: 'Sunset huck', isAutoNamed: false, recordedAt: '2026-08-29T19:02:00Z', durationMs: 2800, maxRpm: 1240, isFavorite: true },
  ],
  'disc-reds': [
    { id: 't3', discId: 'disc-reds', name: 'Endzone huck', isAutoNamed: false, recordedAt: '2026-08-22T11:14:00Z', durationMs: 2500, maxRpm: 1100, isFavorite: false },
    { id: 't4', discId: 'disc-reds', name: 'Short flick', isAutoNamed: false, recordedAt: '2026-08-21T09:00:00Z', durationMs: 1200, maxRpm: 800, isFavorite: false },
  ],
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/search', component: { template: '<div />' } },
      { path: '/discs/:id', component: { template: '<div />' } },
      { path: '/shared/:id', component: { template: '<div />' } },
      { path: '/discs/:id/throw/:throwId', component: { template: '<div />' } },
      { path: '/shared/:id/throw/:throwId', component: { template: '<div />' } },
    ],
  })
}

async function mountSearchView() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const authStore = useAuthStore()
  authStore.token = 'test-token'

  const router = makeRouter()
  await router.push('/search')
  await router.isReady()

  const wrapper = mount(SearchView, {
    global: { plugins: [pinia, router] },
  })
  await flushPromises()
  return { wrapper, router }
}

describe('SearchView — real disc/throw search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiFetch.mockImplementation(async (path, opts = {}) => {
      const method = opts.method ?? 'GET'
      if (path === '/api/discs' && method === 'GET') return OWNED
      if (path === '/api/discs/shared' && method === 'GET') return SHARED
      const m = path.match(/^\/api\/discs\/([^/]+)\/throws$/)
      if (m && method === 'GET') return THROWS[m[1]] ?? []
      throw new Error(`Unexpected apiFetch call: ${method} ${path}`)
    })
  })

  it('shows nothing but a prompt until the user types', async () => {
    const { wrapper } = await mountSearchView()
    expect(wrapper.text()).toContain('Type to search')
    // No result rows before typing.
    expect(wrapper.find('.result-row').exists()).toBe(false)
    expect(wrapper.find('.throw-row').exists()).toBe(false)
  })

  it('filters discs and throws by the typed query and highlights the disc name', async () => {
    const { wrapper } = await mountSearchView()

    await wrapper.find('.search-input').setValue('huck')
    await flushPromises()

    // "Sky Hucker" disc matches; "huck" throws in all three discs match.
    const text = wrapper.text()
    expect(text).toContain('Sky Hucker')
    expect(text).toContain('Long huck')
    expect(text).toContain('Sunset huck')
    expect(text).toContain('Endzone huck')
    // "Short flick" does not contain "huck".
    expect(text).not.toContain('Short flick')

    // Disc-name highlight renders a <mark> around the matched substring.
    const mark = wrapper.find('.result-name mark')
    expect(mark.exists()).toBe(true)
    expect(mark.text().toLowerCase()).toBe('huck')

    // Chip counts: 1 disc + 3 throws = 4 total.
    const chips = wrapper.findAll('.chip-btn')
    expect(chips[0].text()).toContain('4')
    expect(chips[1].text()).toContain('1')
    expect(chips[2].text()).toContain('3')

    // The shared disc's throw carries the read-only chip.
    expect(wrapper.text()).toContain('Read')
  })

  it('narrows to discs-only or throws-only via the filter chips', async () => {
    const { wrapper } = await mountSearchView()
    await wrapper.find('.search-input').setValue('huck')
    await flushPromises()

    const chips = wrapper.findAll('.chip-btn')
    // Discs-only.
    await chips[1].trigger('click')
    expect(wrapper.text()).toContain('Sky Hucker')
    expect(wrapper.text()).not.toContain('Long huck')

    // Throws-only.
    await chips[2].trigger('click')
    expect(wrapper.text()).toContain('Long huck')
    expect(wrapper.find('.result-row').exists()).toBe(false)
  })

  it('navigates to the right route when a disc result is clicked', async () => {
    const { wrapper, router } = await mountSearchView()
    const push = vi.spyOn(router, 'push')

    await wrapper.find('.search-input').setValue('Sky')
    await flushPromises()

    await wrapper.find('.result-row').trigger('click')
    expect(push).toHaveBeenCalledWith('/discs/disc-sky')
  })

  it('shows a no-results message when nothing matches', async () => {
    const { wrapper } = await mountSearchView()
    await wrapper.find('.search-input').setValue('zzzzz')
    await flushPromises()
    expect(wrapper.text()).toContain('No matches found')
  })
})
