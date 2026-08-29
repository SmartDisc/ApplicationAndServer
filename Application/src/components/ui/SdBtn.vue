<script setup>
defineProps({
  variant: { type: String, default: 'primary' }, // primary | gold | glass | ghost | dark-glass
  size:    { type: String, default: 'md' },       // sm | md | lg
  block:   { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  type:    { type: String, default: 'button' },
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="[
      'sd-btn',
      `sd-btn--${variant}`,
      `sd-btn--${size}`,
      { 'sd-btn--block': block },
    ]"
  >
    <slot name="icon-left" />
    <slot />
    <slot name="icon-right" />
  </button>
</template>

<style scoped>
.sd-btn {
  font-family: var(--sd-font-display);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  border-radius: var(--sd-r-pill);
  transition: opacity var(--sd-dur-fast) var(--sd-ease-out),
              transform var(--sd-dur-fast) var(--sd-ease-out),
              box-shadow var(--sd-dur-fast) var(--sd-ease-out);
  /* md default */
  font-size: 15px;
  padding: 13px 22px;
  min-height: 48px;
  margin-top: 5px;
}
.sd-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.sd-btn:not(:disabled):active { transform: scale(0.97); }

/* Sizes */
.sd-btn--sm { font-size: 13px; padding: 8px 14px; min-height: 36px; }
.sd-btn--lg { font-size: 16px; padding: 15px 22px; min-height: 54px; }
.sd-btn--block { width: 100%; }

/* Variants */
.sd-btn--primary {
  background: var(--sd-ink);
  color: #fff;
  box-shadow: var(--sd-shadow-md);
}
.sd-btn--primary:not(:disabled):hover { background: var(--sd-ink-700); }

.sd-btn--gold {
  background: var(--sd-gold-grad);
  color: #5a4416;
  box-shadow: var(--sd-shadow-md);
}
.sd-btn--gold:not(:disabled):hover { opacity: 0.9; }

.sd-btn--glass {
  background: var(--sd-glass-light-bg);
  color: var(--sd-fg1);
  -webkit-backdrop-filter: var(--sd-glass-blur);
          backdrop-filter: var(--sd-glass-blur);
  border: 1px solid var(--sd-glass-light-border);
  box-shadow: var(--sd-shadow-glass);
}
.sd-btn--glass:not(:disabled):hover { background: rgba(255,255,255,.72); }

.sd-btn--ghost {
  background: transparent;
  color: var(--sd-ink);
  border: 1.5px solid rgba(16, 42, 87, .18);
}
.sd-btn--ghost:not(:disabled):hover { background: rgba(16,42,87,.05); }

.sd-btn--dark-glass {
  background: var(--sd-glass-dark-bg);
  color: var(--sd-fg-on-dark);
  border: 1px solid var(--sd-glass-dark-border);
  -webkit-backdrop-filter: var(--sd-glass-blur);
          backdrop-filter: var(--sd-glass-blur);
  box-shadow: var(--sd-shadow-glass-dark);
}
.sd-btn--dark-glass:not(:disabled):hover { background: rgba(16,42,87,.70); }
</style>
