// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

// QrScanner drives the real camera (getUserMedia) which happy-dom doesn't
// implement, so it's stubbed here — the scan/manual wiring in AddDiscView is
// what this test covers, not the camera pipeline (see pairing.test.js for the
// payload-parsing logic, and useQrScanner.js for the getUserMedia/jsQR glue).
vi.mock('@/components/discs/QrScanner.vue', () => ({
  default: {
    name: 'QrScanner',
    emits: ['decode', 'error'],
    template: '<div class="qr-scanner-stub" />',
  },
}))

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
import AddDiscView from '@/views/discs/AddDiscView.vue'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/discs/add', component: AddDiscView },
      { path: '/discs/:id/paired', component: { template: '<div />' } },
    ],
  })
}

async function mountAddDiscView() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const authStore = useAuthStore()
  authStore.token = 'test-token'

  const router = makeRouter()
  await router.push('/discs/add')
  await router.isReady()

  const wrapper = mount(AddDiscView, {
    global: { plugins: [pinia, router] },
  })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  apiFetch.mockReset()
  // getUserMedia isn't implemented by happy-dom; AddDiscView only reads its
  // presence to decide the default mode, so a stub is enough here.
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn() },
    configurable: true,
  })
})

describe('AddDiscView', () => {
  it('defaults to scan mode with manual entry available as a fallback', async () => {
    const { wrapper } = await mountAddDiscView()
    expect(wrapper.find('.qr-scanner-stub').exists()).toBe(true)
    expect(wrapper.find('input').exists()).toBe(false)

    const manualTabBtn = wrapper.findAll('button').find(b => b.text().includes('Enter manually'))
    await manualTabBtn.trigger('click')
    expect(wrapper.find('.qr-scanner-stub').exists()).toBe(false)
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('claims the disc and navigates on a valid scanned pairing code', async () => {
    apiFetch.mockResolvedValueOnce({ id: 'disc-1', name: 'Disc' })
    const { wrapper, router } = await mountAddDiscView()

    await wrapper.findComponent({ name: 'QrScanner' }).vm.$emit(
      'decode',
      'smartdisc://pair?id=9224b45d-4ab0-4ba4-a318-de6d898d6c45&password=AbC123xyz789',
    )
    await flushPromises()

    expect(apiFetch).toHaveBeenCalledWith('/api/discs/claim', expect.objectContaining({
      method: 'POST',
      body: { id: '9224b45d-4ab0-4ba4-a318-de6d898d6c45', password: 'AbC123xyz789' },
    }))
    expect(router.currentRoute.value.fullPath).toBe('/discs/disc-1/paired')
  })

  it('shows an error and does not call the API for an unrecognized QR code', async () => {
    const { wrapper } = await mountAddDiscView()

    await wrapper.findComponent({ name: 'QrScanner' }).vm.$emit('decode', 'not a pairing code')
    await flushPromises()

    expect(apiFetch).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain("isn't a SmartDisc pairing code")
  })

  it('still pairs via the manual form exactly as before', async () => {
    apiFetch.mockResolvedValueOnce({ id: 'disc-2', name: 'Disc' })
    const { wrapper, router } = await mountAddDiscView()

    const manualTabBtn = wrapper.findAll('button').find(b => b.text().includes('Enter manually'))
    await manualTabBtn.trigger('click')
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('9224b45d-4ab0-4ba4-a318-de6d898d6c45')
    await inputs[1].setValue('AbC123xyz789')
    await wrapper.find('button.sd-btn').trigger('click')
    await flushPromises()

    expect(apiFetch).toHaveBeenCalledWith('/api/discs/claim', expect.objectContaining({
      body: { id: '9224b45d-4ab0-4ba4-a318-de6d898d6c45', password: 'AbC123xyz789' },
    }))
    expect(router.currentRoute.value.fullPath).toBe('/discs/disc-2/paired')
  })
})
