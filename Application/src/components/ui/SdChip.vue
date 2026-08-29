<script setup>
defineProps({
  tone: { type: String, default: 'neutral' }, // neutral | owner | gold | read | solid-light
})
</script>

<template>
  <span :class="['sd-chip', `sd-chip--${tone}`]">
    <slot name="icon" />
    <slot />
  </span>
</template>

<style scoped>
.sd-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 11.5px;
  padding: 5px 10px;
  border-radius: var(--sd-r-pill);
  line-height: 1;
  white-space: nowrap;
}

.sd-chip--neutral    { background: rgba(111,147,181,.2); color: var(--sd-ink-800); }
.sd-chip--owner      { background: var(--sd-ink); color: #fff; }
.sd-chip--gold       { background: var(--sd-glass-gold-bg); border: 1px solid var(--sd-glass-gold-border); color: #5a4416; }
.sd-chip--read       { background: rgba(111,147,181,.18); color: var(--sd-ink-700); }
.sd-chip--solid-light {
  background: #fff;
  color: var(--sd-ink);
  border: 1px solid var(--sd-glass-light-border);
}
</style>
