// @vitest-environment happy-dom
// Mounted in a real component so the composable's watch + onUnmounted run the
// way they do in SdAvatar/SdDiscImage — the lifecycle is the whole point here.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/api', () => {
  class ApiError extends Error {
    constructor(message, { status = null, code = null } = {}) {
      super(message)
      this.name = 'ApiError'
      this.status = status
      this.code = code
    }
  }
  return { apiFetch: vi.fn(), apiFetchBlob: vi.fn(), ApiError }
})

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async () => ({ value: null })),
    set: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
  },
}))

import { apiFetchBlob, ApiError } from '@/services/api'
import { useAuthedImage } from '@/composables/useAuthedImage'

// happy-dom has no blob-URL registry, so object URLs are tracked by hand —
// that ledger is what the leak assertions below read.
let created
let revoked

// The composable caches by URL across tests, so every case needs its own.
let urlSeq = 0
const freshUrl = () => `/api/users/1/avatar?v=${++urlSeq}`

function mountWith(url) {
  return mount({
    props: { url: { type: String, default: null } },
    setup: (props) => useAuthedImage(() => props.url),
    template: '<span />',
  }, { props: { url } })
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  created = []
  revoked = []
  URL.createObjectURL = vi.fn((blob) => {
    const url = `blob:mock/${created.length}`
    created.push({ url, blob })
    return url
  })
  URL.revokeObjectURL = vi.fn((url) => { revoked.push(url) })
})

afterEach(() => {
  delete URL.createObjectURL
  delete URL.revokeObjectURL
})

describe('useAuthedImage', () => {
  it('binds the fetched bytes as an object URL', async () => {
    apiFetchBlob.mockResolvedValue(new Blob(['bytes'], { type: 'image/webp' }))
    const url = freshUrl()

    const wrapper = mountWith(url)
    await flushPromises()

    expect(apiFetchBlob).toHaveBeenCalledWith(url, expect.objectContaining({ token: null }))
    expect(wrapper.vm.src).toBe('blob:mock/0')
    expect(wrapper.vm.failed).toBe(false)
    expect(wrapper.vm.loading).toBe(false)
  })

  it('treats a 404 as "no photo" rather than an error', async () => {
    apiFetchBlob.mockRejectedValue(new ApiError('Avatar not found.', { status: 404, code: 'avatar_not_found' }))

    const wrapper = mountWith(freshUrl())
    await flushPromises()

    // No photo and no throw: the caller falls back to initials.
    expect(wrapper.vm.src).toBeNull()
    expect(wrapper.vm.failed).toBe(true)
    expect(wrapper.vm.loading).toBe(false)
  })

  it('never fetches when there is no image URL', async () => {
    const wrapper = mountWith(null)
    await flushPromises()

    expect(apiFetchBlob).not.toHaveBeenCalled()
    expect(wrapper.vm.src).toBeNull()
  })

  it('shares one fetch and one blob between rows showing the same person', async () => {
    apiFetchBlob.mockResolvedValue(new Blob(['bytes'], { type: 'image/webp' }))
    const url = freshUrl()

    const a = mountWith(url)
    const b = mountWith(url)
    await flushPromises()

    expect(apiFetchBlob).toHaveBeenCalledTimes(1)
    const objectUrl = a.vm.src
    expect(b.vm.src).toBe(objectUrl)

    // Still on screen in `b`, so unmounting `a` must not revoke it. Unmounting
    // both only makes the entry idle — it is kept so scrolling a list back up
    // does not refetch.
    a.unmount()
    b.unmount()
    expect(revoked).not.toContain(objectUrl)

    mountWith(url)
    await flushPromises()
    expect(apiFetchBlob).toHaveBeenCalledTimes(1)
  })

  it('aborts and revokes an in-flight entry once it is evicted', async () => {
    let deliver
    apiFetchBlob.mockReturnValueOnce(new Promise((resolve) => { deliver = resolve }))

    mountWith(freshUrl()).unmount()
    const [, options] = apiFetchBlob.mock.calls[0]

    // Push it past the idle bound. IDLE_LIMIT is 60, so 61 stand-ins evict it.
    apiFetchBlob.mockResolvedValue(new Blob(['other'], { type: 'image/webp' }))
    for (let i = 0; i < 61; i++) mountWith(freshUrl()).unmount()
    await flushPromises()

    expect(options.signal.aborted).toBe(true)

    // A fetch already past the point of no return still resolves; its blob must
    // not be parked on a cache entry nothing can reach — that would leak it.
    deliver(new Blob(['bytes'], { type: 'image/webp' }))
    await flushPromises()

    expect(revoked).toContain(created[created.length - 1].url)
  })
})
