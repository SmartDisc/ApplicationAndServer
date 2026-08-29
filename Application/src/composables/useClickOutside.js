import { onMounted, onUnmounted } from 'vue'

/**
 * Invokes `handler` whenever a pointer-down event lands outside the element
 * referenced by `target`. Useful for closing popovers/dropdowns on outside click.
 *
 * @param {import('vue').Ref<HTMLElement|null>} target - ref to the container element
 *   that should NOT trigger the handler when clicked inside.
 * @param {(event: MouseEvent) => void} handler - called on outside clicks.
 */
export function useClickOutside(target, handler) {
  function onPointerDown(event) {
    const el = target.value
    if (el && !el.contains(event.target)) {
      handler(event)
    }
  }

  onMounted(() => document.addEventListener('mousedown', onPointerDown))
  onUnmounted(() => document.removeEventListener('mousedown', onPointerDown))
}
