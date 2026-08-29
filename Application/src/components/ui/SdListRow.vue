<script setup>
// A single row inside SdList: leading icon, title/subtitle copy, trailing content.
// Renders as a <button> (tappable) or a plain <div> (informational row).
defineProps({
  title:    { type: String, default: '' },
  subtitle: { type: String, default: '' },
  tappable: { type: Boolean, default: false },
  danger:   { type: Boolean, default: false },
})
</script>

<template>
  <component
    :is="tappable ? 'button' : 'div'"
    :type="tappable ? 'button' : undefined"
    :class="['sd-list-row', { 'sd-list-row--tap': tappable, 'sd-list-row--danger': danger }]"
  >
    <slot name="icon" />
    <div class="sd-list-row__copy">
      <div v-if="title" class="sd-list-row__title">{{ title }}</div>
      <div v-if="subtitle" class="sd-list-row__sub">{{ subtitle }}</div>
      <slot />
    </div>
    <slot name="trailing" />
  </component>
</template>

<style scoped>
.sd-list-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  width: 100%;
  background: none;
  border: none;
  text-align: left;
  font: inherit;
  color: inherit;
}
.sd-list-row + .sd-list-row { border-top: 1px solid rgba(16, 42, 87, .07); }

.sd-list-row--tap { cursor: pointer; }
.sd-list-row--tap:hover  { background: rgba(16, 42, 87, .03); }
.sd-list-row--tap:active { background: rgba(16, 42, 87, .07); }

.sd-list-row--danger { color: var(--sd-danger); }

.sd-list-row__copy { flex: 1; min-width: 0; }
.sd-list-row__title {
  font-family: var(--sd-font-body);
  font-weight: 600;
  font-size: 14px;
  color: var(--sd-fg1);
  line-height: 1.2;
}
.sd-list-row--danger .sd-list-row__title { color: var(--sd-danger); }

.sd-list-row__sub {
  font-family: var(--sd-font-body);
  font-size: 12px;
  color: var(--sd-fg3);
  margin-top: 3px;
  line-height: 1.3;
}
</style>
