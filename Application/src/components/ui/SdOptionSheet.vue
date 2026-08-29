<script setup>
// Bottom sheet presenting a single-select list of options (e.g. distance unit,
// language). Pairs SdBottomSheet with a checkmark-style option list.
import { Check } from 'lucide-vue-next'
import SdBottomSheet from './SdBottomSheet.vue'

defineProps({
  modelValue: { type: Boolean, default: false },
  title:      { type: String, default: '' },
  options:    { type: Array, required: true }, // [{ value, label, badge? }]
  selected:   { type: [String, Number], default: null },
})
const emit = defineEmits(['update:modelValue', 'select'])

function pick(value) {
  emit('select', value)
  emit('update:modelValue', false)
}
</script>

<template>
  <SdBottomSheet :model-value="modelValue" :title="title" @update:model-value="v => emit('update:modelValue', v)">
    <div class="sd-option-list">
      <button
        v-for="opt in options"
        :key="opt.value"
        class="sd-option-row"
        :class="{ 'sd-option-row--active': selected === opt.value }"
        @click="pick(opt.value)"
      >
        <span class="sd-option-row__label">{{ opt.label }}</span>
        <span v-if="opt.badge" class="sd-option-row__badge">{{ opt.badge }}</span>
        <Check v-if="selected === opt.value" :size="18" style="color: var(--sd-ink); flex-shrink: 0;" />
      </button>
    </div>
  </SdBottomSheet>
</template>

<style scoped>
.sd-option-list { display: flex; flex-direction: column; gap: 4px; }

.sd-option-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: var(--sd-r-md);
  background: none;
  border: 1px solid transparent;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: background var(--sd-dur-fast) var(--sd-ease-out),
              border-color var(--sd-dur-fast) var(--sd-ease-out);
}
.sd-option-row:hover  { background: rgba(16, 42, 87, .04); }
.sd-option-row:active { background: rgba(16, 42, 87, .08); }
.sd-option-row--active {
  background: rgba(16, 42, 87, .06);
  border-color: rgba(16, 42, 87, .14);
}

.sd-option-row__label {
  flex: 1;
  font-family: var(--sd-font-body);
  font-weight: 600;
  font-size: 15px;
  color: var(--sd-fg1);
}
.sd-option-row__badge {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 13px;
  color: var(--sd-fg3);
}
</style>
