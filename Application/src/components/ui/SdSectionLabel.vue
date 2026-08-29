<script setup>
// Small uppercase eyebrow used to head a group of settings/list content.
</script>

<template>
  <p class="sd-section-label"><slot /></p>
</template>

<style scoped>
.sd-section-label {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--sd-azure);
  margin: 6px 0 10px;
}
</style>
