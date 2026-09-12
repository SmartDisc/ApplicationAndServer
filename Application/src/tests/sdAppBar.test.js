// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SdAppBar from '@/components/ui/SdAppBar.vue'

function makeRouter(startAt) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/a', component: { template: '<div />' } },
      { path: '/b', component: { template: '<div />' } },
      { path: '/c', component: { template: '<div />' } },
    ],
  })
  router.push(startAt)
  return router
}

// Regression test: a back button with an explicit backTo must *replace* the
// current history entry, not push a new one. Pushing here was the root cause
// of a real bug — recording a throw pushes disc → live → throw-detail, and
// the throw-detail back button (backTo=disc) used to push a 4th entry on top
// instead of collapsing back to it, leaving throw-detail still reachable by
// a *later*, unrelated back() call (e.g. from the disc screen itself),
// bouncing the user back into the throw view instead of towards the menu.
describe('SdAppBar back button', () => {
  it('replaces the current entry when backTo is given, rather than pushing a new one', async () => {
    const router = makeRouter('/a')
    await router.push('/b') // simulate an intermediate screen, like /live
    await router.push('/c') // simulate landing on the screen with the back button
    await router.isReady()

    const wrapper = mount(SdAppBar, {
      props: { back: true, backTo: '/a' },
      global: { plugins: [router] },
    })

    await wrapper.find('.appbar__back').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/a')

    // If backTo had pushed rather than replaced, /c would still be one
    // history entry back from /a, and this back() would land on it instead
    // of continuing on to /b (or beyond).
    router.back()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/b')
  })

  it('falls back to router.back() when no backTo is given', async () => {
    const router = makeRouter('/a')
    await router.push('/b')
    await router.isReady()

    const backSpy = vi.spyOn(router, 'back')

    const wrapper = mount(SdAppBar, {
      props: { back: true },
      global: { plugins: [router] },
    })

    await wrapper.find('.appbar__back').trigger('click')

    expect(backSpy).toHaveBeenCalled()
  })
})
