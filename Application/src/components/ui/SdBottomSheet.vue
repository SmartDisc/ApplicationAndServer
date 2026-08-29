<script setup>
import { ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title:      { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

function close() { emit('update:modelValue', false) }

// ── Swipe-to-dismiss ─────────────────────────────────────────────────────────
const panel       = ref(null)
const dragStart   = ref(0)
const dragging    = ref(false)
const dragY       = ref(0)
const velocityY   = ref(0)
const lastTouchY  = ref(0)
const lastTouchMs = ref(0)

function onDragStart(e) {
  // ≥768px the sheet renders as a centered dialog — swipe-to-dismiss is a
  // bottom-sheet gesture and would fight the dialog's centering transform.
  if (window.matchMedia('(min-width: 768px)').matches) return
  dragStart.value   = e.touches[0].clientY
  lastTouchY.value  = e.touches[0].clientY
  lastTouchMs.value = Date.now()
  dragging.value    = true
  dragY.value       = 0
  velocityY.value   = 0
  if (panel.value) panel.value.style.transition = 'none'
}

function onDragMove(e) {
  if (!dragging.value) return
  const currentY = e.touches[0].clientY
  const now      = Date.now()
  const dt       = now - lastTouchMs.value
  if (dt > 0) velocityY.value = (currentY - lastTouchY.value) / dt
  lastTouchY.value  = currentY
  lastTouchMs.value = now

  const delta = currentY - dragStart.value
  if (delta > 0) {
    dragY.value = delta
    if (panel.value)
      panel.value.style.transform = `translateX(-50%) translateY(${delta}px)`
  }
}

function onDragEnd() {
  if (!dragging.value) return
  dragging.value = false

  // Dismiss on large drag OR fast downward flick
  if (dragY.value >= 60 || velocityY.value > 0.4) {
    if (panel.value) panel.value.style.transition = ''
    close()
  } else {
    // Snap back with spring
    if (panel.value) {
      panel.value.style.transition = 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)'
      panel.value.style.transform  = 'translateX(-50%)'
      setTimeout(() => {
        if (panel.value) {
          panel.value.style.transition = ''
          panel.value.style.transform  = ''
        }
      }, 280)
    }
  }
  dragY.value    = 0
  velocityY.value = 0
}

watch(() => props.modelValue, (open) => {
  if (open && panel.value) {
    panel.value.style.transition = ''
    panel.value.style.transform  = ''
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet-backdrop">
      <div v-if="modelValue" class="sheet-backdrop" @click.self="close" />
    </Transition>
    <Transition name="sheet-panel">
      <div
        v-if="modelValue"
        ref="panel"
        class="sheet-panel"
      >
        <!-- Drag handle zone — touch events only here so body can scroll freely -->
        <div
          class="sheet-drag-zone"
          @touchstart.passive="onDragStart"
          @touchmove.passive="onDragMove"
          @touchend.passive="onDragEnd"
          @touchcancel.passive="onDragEnd"
        >
          <div class="sheet-pill" />
          <div class="sheet-header">
            <span class="sheet-title">{{ title }}</span>
          </div>
        </div>

        <div class="sheet-body">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 28, 61, .35);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 200;
}

.sheet-panel {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: var(--sd-content-max);
  max-height: 85vh;
  max-height: 85dvh;
  background: var(--sd-glass-paper-bg);
  backdrop-filter: var(--sd-glass-blur-strong);
  -webkit-backdrop-filter: var(--sd-glass-blur-strong);
  border: 1px solid var(--sd-glass-paper-border);
  border-bottom: none;
  border-radius: var(--sd-r-xl) var(--sd-r-xl) 0 0;
  box-shadow: var(--sd-shadow-lg);
  z-index: 201;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* Extend behind home indicator on iOS */
  padding-bottom: env(safe-area-inset-bottom, 0);
  will-change: transform;
}

.sheet-drag-zone {
  flex-shrink: 0;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}
.sheet-drag-zone:active { cursor: grabbing; }

.sheet-pill {
  width: 36px;
  height: 4px;
  border-radius: 999px;
  background: rgba(16, 42, 87, .18);
  margin: 12px auto 0;
}

.sheet-header {
  display: flex;
  align-items: center;
  padding: 14px 20px 12px;
}

.sheet-title {
  flex: 1;
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 17px;
  color: var(--sd-fg1);
}

.sheet-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--sd-fg3);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 999px;
  transition: color var(--sd-dur-fast) var(--sd-ease-out),
              background var(--sd-dur-fast) var(--sd-ease-out);
  -webkit-tap-highlight-color: transparent;
}
.sheet-close:hover { color: var(--sd-fg1); background: rgba(16,42,87,.06); }

.sheet-body {
  overflow-y: auto;
  padding: 0 20px 24px;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

/* Transitions */
.sheet-backdrop-enter-active,
.sheet-backdrop-leave-active {
  transition: opacity var(--sd-dur-base) var(--sd-ease-out);
}
.sheet-backdrop-enter-from,
.sheet-backdrop-leave-to { opacity: 0; }

.sheet-panel-enter-active,
.sheet-panel-leave-active {
  transition: transform var(--sd-dur-base) var(--sd-ease-glass);
}
.sheet-panel-enter-from,
.sheet-panel-leave-to { transform: translateX(-50%) translateY(100%) !important; }

/* ── Tablet (≥768px): centered dialog instead of a bottom sheet ─────────── */
@media (min-width: 768px) {
  .sheet-panel {
    bottom: auto;
    top: 50%;
    transform: translate(-50%, -50%);
    max-width: 540px;
    max-height: 80vh;
    max-height: 80dvh;
    border-bottom: 1px solid var(--sd-glass-paper-border);
    border-radius: var(--sd-r-xl);
    padding-bottom: 0;
  }

  .sheet-drag-zone { cursor: default; }
  .sheet-drag-zone:active { cursor: default; }
  .sheet-pill { display: none; }
  .sheet-header { padding-top: 20px; }

  /* Fade/scale in place — the slide-off-screen transform above is a
     bottom-sheet-only affordance. */
  .sheet-panel-enter-active,
  .sheet-panel-leave-active {
    transition: transform var(--sd-dur-base) var(--sd-ease-glass),
                opacity var(--sd-dur-base) var(--sd-ease-out);
  }
  .sheet-panel-enter-from,
  .sheet-panel-leave-to {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.96) !important;
  }
}
</style>
