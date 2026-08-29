<script setup>
// Navigation row for SdList: icon in a solid tile, label, optional hint, chevron.
// Renders as a RouterLink when `to` is given, otherwise a plain button (e.g. sign out).
import { ChevronRight } from 'lucide-vue-next'

defineProps({
  to:     { type: String, default: '' },
  label:  { type: String, required: true },
  hint:   { type: String, default: '' },
  danger: { type: Boolean, default: false },
})
</script>

<template>
  <component
    :is="to ? 'RouterLink' : 'button'"
    :to="to || undefined"
    :type="to ? undefined : 'button'"
    :class="['sd-nav-row', { 'sd-nav-row--danger': danger }]"
  >
    <div :class="['sd-nav-row__icon', { 'sd-nav-row__icon--danger': danger }]">
      <slot name="icon" />
    </div>
    <span class="sd-nav-row__label">{{ label }}</span>
    <span v-if="hint" class="sd-nav-row__hint">{{ hint }}</span>
    <ChevronRight v-if="to" :size="16" style="color: var(--sd-fg3);" />
  </component>
</template>

<style scoped>
.sd-nav-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  font-family: var(--sd-font-body);
  font-size: 15px;
  color: var(--sd-fg1);
  text-decoration: none;
  background: none;
  border: none;
  width: 100%;
  cursor: pointer;
  text-align: left;
}
.sd-nav-row + .sd-nav-row { border-top: 1px solid rgba(16, 42, 87, .07); }

.sd-nav-row--danger { color: var(--sd-danger); }

.sd-nav-row__icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(140deg, #1d3d72, #0a1c3d);
  color: #fff;
  flex: none;
}
.sd-nav-row__icon--danger {
  background: rgba(192, 88, 78, .14);
  color: var(--sd-danger);
}

.sd-nav-row__label { flex: 1; }

.sd-nav-row__hint {
  font-family: var(--sd-font-display);
  font-size: 12px;
  color: var(--sd-fg3);
}
</style>
