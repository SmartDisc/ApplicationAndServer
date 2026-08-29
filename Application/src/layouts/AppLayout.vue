<script setup>
import SdTabBar from '@/components/ui/SdTabBar.vue'

defineProps({
  tabs: { type: Boolean, default: true },
})
</script>

<template>
  <div class="app-wrap">
    <div class="app-blooms" aria-hidden="true">
      <span class="app-blooms__b3" />
    </div>
    <div class="app-frame">
      <slot />
    </div>
    <div v-if="tabs" class="app-tabbar-wrap">
      <SdTabBar />
    </div>
  </div>
</template>

<style scoped>
.app-wrap {
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--sd-paper);
  position: relative;
  overflow: hidden;
  padding-left: env(safe-area-inset-left, 0);
  padding-right: env(safe-area-inset-right, 0);
}

.app-blooms {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.app-blooms::before {
  content: '';
  position: absolute;
  width: 480px;
  height: 480px;
  left: -160px;
  top: -160px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(111, 147, 181, .55), transparent 62%);
}
.app-blooms::after {
  content: '';
  position: absolute;
  width: 420px;
  height: 420px;
  right: -160px;
  top: 30%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(222, 195, 140, .45), transparent 60%);
}
.app-blooms__b3 {
  position: absolute;
  width: 360px;
  height: 360px;
  left: -60px;
  bottom: -160px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(16, 42, 87, .22), transparent 60%);
}

.app-frame {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: var(--sd-content-max);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  padding: 0 var(--sd-gutter);
  padding-top: env(safe-area-inset-top, 0);
}

.app-tabbar-wrap {
  position: relative;
  z-index: 1;
  flex: none;
  width: 100%;
  max-width: var(--sd-content-max);
  padding-bottom: env(safe-area-inset-bottom, 0);
}

/* ── Tablet (≥768px): wider centered content column — navigation stays the
   same bottom tab bar at every width. ─────────────────────────────────── */
@media (min-width: 768px) {
  .app-frame {
    max-width: var(--sd-content-max-md);
    padding: 0 32px;
    padding-top: env(safe-area-inset-top, 0);
    padding-bottom: env(safe-area-inset-bottom, 0);
  }
}

@media (min-width: 1024px) {
  .app-frame {
    max-width: 960px;
  }
}
</style>
