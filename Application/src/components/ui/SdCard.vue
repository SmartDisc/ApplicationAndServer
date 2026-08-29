<script setup>
// Generic glass-panel surface — the background/border/blur/shadow shared by
// every "card" in the app (hero cards, profile card, stat tiles, FAQ panel…).
defineProps({
  padding: { type: [String, Number], default: 16 },
  flex:    { type: Boolean, default: false }, // flex: 1, for cards laid out side by side
})
</script>

<template>
  <div
    :class="['sd-card', { 'sd-card--flex': flex }]"
    :style="{ padding: typeof padding === 'number' ? `${padding}px` : padding }"
  >
    <slot />
  </div>
</template>

<style scoped>
.sd-card {
  background: var(--sd-glass-light-bg);
  border: 1px solid var(--sd-glass-light-border);
  -webkit-backdrop-filter: var(--sd-glass-blur);
          backdrop-filter: var(--sd-glass-blur);
  border-radius: var(--sd-r-lg);
  box-shadow: var(--sd-shadow-glass);
}
.sd-card--flex { flex: 1; }
</style>
