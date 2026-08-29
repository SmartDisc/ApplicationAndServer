<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  disabled:   { type: Boolean, default: false },
})
defineEmits(['update:modelValue'])
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :disabled="disabled"
    :class="['sd-toggle', { on: modelValue }]"
    @click="!disabled && $emit('update:modelValue', !modelValue)"
  >
    <div class="sd-toggle__knob" />
  </button>
</template>

<style scoped>
.sd-toggle {
  width: 46px;
  height: 28px;
  border-radius: 999px;
  background: var(--sd-mist);
  padding: 3px;
  flex: none;
  border: none;
  cursor: pointer;
  box-shadow: inset 0 1px 1px rgba(0,0,0,.05);
  transition: background var(--sd-dur-base) var(--sd-ease-glass);
}
.sd-toggle:disabled { opacity: 0.45; cursor: not-allowed; }
.sd-toggle.on { background: var(--sd-success); }

.sd-toggle__knob {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  box-shadow: var(--sd-shadow-sm);
  transition: transform var(--sd-dur-base) var(--sd-ease-glass);
}
.sd-toggle.on .sd-toggle__knob { transform: translateX(18px); }
</style>
