<script setup>
// Glass-panel container for a group of SdListRow / SdNavRow items.
</script>

<template>
  <div class="sd-list"><slot /></div>
</template>

<style scoped>
.sd-list {
  background: var(--sd-glass-light-bg);
  border: 1px solid var(--sd-glass-light-border);
  -webkit-backdrop-filter: var(--sd-glass-blur-thin);
          backdrop-filter: var(--sd-glass-blur-thin);
  border-radius: var(--sd-r-md);
  box-shadow: var(--sd-shadow-glass);
  overflow: hidden;
}
</style>
