<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label:       { type: String, default: '' },
  placeholder: { type: String, default: '' },
  type:        { type: String, default: 'text' },
  disabled:    { type: Boolean, default: false },
  /** Purely for viewing: input can't be focused, clicked, or edited, but looks identical to an active field. */
  readonly:    { type: Boolean, default: false },
  error:       { type: String, default: '' },
  maxlength:   { type: Number, default: null },
  autocomplete: { type: String, default: 'off' },
  /** Optional sanitizer function — called on every keystroke before emitting. */
  sanitize:    { type: Function, default: null },
})

const emit = defineEmits(['update:modelValue'])
const focused = ref(false)

function onInput(e) {
  let value = e.target.value
  if (props.sanitize) {
    const clean = props.sanitize(value)
    if (clean !== value) {
      e.target.value = clean   // rewrite the DOM value if sanitized
      value = clean
    }
  }
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="sd-field">
    <label v-if="label" class="sd-field__label">{{ label }}</label>

    <div
      :class="[
        'sd-field__box',
        { 'sd-field__box--focus': focused },
        { 'sd-field__box--placeholder': !modelValue },
        { 'sd-field__box--error': error },
        { 'sd-field__box--disabled': disabled },
        { 'sd-field__box--readonly': readonly },
      ]"
    >
      <span v-if="$slots.icon" class="sd-field__icon">
        <slot name="icon" />
      </span>

      <input
        :value="modelValue"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :tabindex="readonly ? -1 : undefined"
        :maxlength="maxlength ?? undefined"
        :autocomplete="autocomplete"
        class="sd-field__input"
        @input="onInput"
        @focus="focused = true"
        @blur="focused = false"
      />

      <span v-if="$slots.action" class="sd-field__action">
        <slot name="action" />
      </span>
    </div>

    <span v-if="error" class="sd-field__error">{{ error }}</span>
  </div>
</template>

<style scoped>
.sd-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sd-field__label {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--sd-fg2);
  padding-left: 4px;
}

.sd-field__box {
  display: flex;
  align-items: center;
  gap: 11px;
  height: 52px;
  padding: 0 18px;
  border-radius: var(--sd-r-md);
  background: rgba(255, 255, 255, .72);
  border: 1px solid rgba(16, 42, 87, .10);
  box-shadow: inset 0 1px 1px rgba(16, 42, 87, .03);
  transition: border-color var(--sd-dur-fast) var(--sd-ease-out),
              box-shadow var(--sd-dur-fast) var(--sd-ease-out),
              background var(--sd-dur-fast) var(--sd-ease-out);
}

.sd-field__box--focus {
  background: #fff;
  border-color: var(--sd-azure);
  box-shadow: 0 0 0 4px rgba(111, 147, 181, .22);
}

.sd-field__box--error {
  border-color: var(--sd-danger);
  box-shadow: 0 0 0 4px rgba(192, 88, 78, .18);
}

.sd-field__box--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.sd-field__box--readonly { cursor: default; }
.sd-field__box--readonly .sd-field__input { cursor: default; pointer-events: none; }

.sd-field__icon {
  color: var(--sd-fg3);
  flex: none;
  display: inline-flex;
}
.sd-field__box--focus .sd-field__icon { color: var(--sd-azure); }

.sd-field__input {
  flex: 1;
  font-family: var(--sd-font-body);
  font-size: 16px;
  color: var(--sd-fg1);
  background: transparent;
  border: none;
  outline: none;
  padding: 0;
  min-width: 0;
}
.sd-field__input::placeholder { color: var(--sd-fg3); }
.sd-field__input:disabled { cursor: not-allowed; }

.sd-field__action {
  flex: none;
  display: inline-flex;
  align-items: center;
  margin-left: -4px;
}

.sd-field__error {
  font-family: var(--sd-font-display);
  font-size: 12px;
  color: var(--sd-danger);
  padding-left: 4px;
}
</style>
