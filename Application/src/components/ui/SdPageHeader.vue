<script setup>
// Hero header for tab-root screens: uppercase eyebrow + large title (+ optional subtitle).
defineProps({
  eyebrow:  { type: String, required: true },
  title:    { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<template>
  <div class="sd-page-header">
    <p class="sd-page-header__eyebrow">{{ eyebrow }}</p>
    <h1 class="sd-page-header__title">{{ title }}</h1>
    <p v-if="subtitle" class="sd-page-header__subtitle">{{ subtitle }}</p>
  </div>
</template>

<style scoped>
.sd-page-header__eyebrow {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--sd-azure);
  margin: 0;
}
.sd-page-header__title {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 32px;
  letter-spacing: -0.02em;
  line-height: 1.02;
  color: var(--sd-fg1);
  margin: 4px 0 0;
}
.sd-page-header__subtitle {
  font-family: var(--sd-font-body);
  font-size: 14px;
  line-height: 1.4;
  color: var(--sd-fg2);
  margin: 6px 0 0;
}
</style>
