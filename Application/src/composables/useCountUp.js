import { computed, onUnmounted, ref, watch } from 'vue'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Animates a display value counting up from 0 to `source` (a ref/computed
 * holding a number, or null while there's nothing to show yet) every time
 * it changes, easing out over `duration`. Returns a computed formatted with
 * `format`, or `placeholder` while `source` is null.
 *
 * @param {import('vue').Ref<number|null>} source
 * @param {(n: number) => string} format
 * @param {{ duration?: number, placeholder?: string }} [options]
 */
export function useCountUp(source, format, { duration = 900, placeholder = '—' } = {}) {
  const current = ref(0)
  let rafId = null

  function animateTo(target) {
    if (rafId != null) cancelAnimationFrame(rafId)

    if (prefersReducedMotion()) {
      current.value = target
      return
    }

    const start = performance.now()
    function frame(now) {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      current.value = target * eased
      rafId = t < 1 ? requestAnimationFrame(frame) : null
    }
    rafId = requestAnimationFrame(frame)
  }

  watch(
    source,
    value => {
      if (value == null || Number.isNaN(value)) {
        if (rafId != null) cancelAnimationFrame(rafId)
        rafId = null
        current.value = 0
        return
      }
      animateTo(value)
    },
    { immediate: true }
  )

  onUnmounted(() => {
    if (rafId != null) cancelAnimationFrame(rafId)
  })

  return computed(() =>
    source.value == null || Number.isNaN(source.value) ? placeholder : format(current.value)
  )
}
