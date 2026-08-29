<script setup>
defineProps({
  v:    { type: [String, Number], required: true },
  u:    { type: String, default: '' },
  k:    { type: String, required: true },
  dark: { type: Boolean, default: false },
})
</script>

<template>
  <div :class="['stat-tile', { 'stat-tile--dark': dark }]">
    <div class="stat-tile__v">
      {{ v }}<span v-if="u" class="stat-tile__u">{{ u }}</span>
    </div>
    <div class="stat-tile__k">{{ k }}</div>
  </div>
</template>

<style scoped>
.stat-tile {
  flex: 1;
  padding: 14px 16px;
  border-radius: var(--sd-r-md);
  background: rgba(255, 255, 255, .6);
  border: 1px solid rgba(255, 255, 255, .6);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-tile--dark {
  background: rgba(255, 255, 255, .06);
  border-color: rgba(255, 255, 255, .10);
}

.stat-tile__v {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 26px;
  color: var(--sd-ink);
  line-height: 1;
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-tile--dark .stat-tile__v { color: #fff; }

.stat-tile__u {
  font-size: 13px;
  color: var(--sd-fg3);
  font-weight: 500;
}

.stat-tile--dark .stat-tile__u { color: var(--sd-fg2-on-dark); }

.stat-tile__k {
  font-family: var(--sd-font-display);
  font-size: 11px;
  color: var(--sd-fg3);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-top: 6px;
}

.stat-tile--dark .stat-tile__k { color: var(--sd-fg2-on-dark); }
</style>
