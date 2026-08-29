<script setup>
// Fixed-length numeric code entry (e.g. email/SMS verification).
// v-model holds the joined digit string; emits 'complete' once fully filled.
// Parent controls failure feedback via the exposed shake()/reset()/focus() methods.
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  length:     { type: Number, default: 6 },
  error:      { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'complete'])

const digits  = ref(Array(props.length).fill(''))
const inputs  = ref([])
const shaking = ref(false)
const code    = computed(() => digits.value.join(''))

watch(code, (val) => {
  emit('update:modelValue', val)
  if (val.length === props.length) emit('complete', val)
})

function focus() { inputs.value[0]?.focus() }

function onInput(i, e) {
  const val = e.target.value.replace(/\D/g, '')
  e.target.value = ''           // reset so Vue controls the value
  if (!val) return
  digits.value[i] = val[val.length - 1]
  if (i < props.length - 1) inputs.value[i + 1]?.focus()
}

function onKeydown(i, e) {
  if (e.key === 'Backspace') {
    if (digits.value[i]) {
      digits.value[i] = ''
    } else if (i > 0) {
      digits.value[i - 1] = ''
      inputs.value[i - 1]?.focus()
    }
    e.preventDefault()
  } else if (e.key === 'ArrowLeft' && i > 0) {
    inputs.value[i - 1]?.focus()
  } else if (e.key === 'ArrowRight' && i < props.length - 1) {
    inputs.value[i + 1]?.focus()
  }
}

function onPaste(e) {
  const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, props.length)
  if (!text) return
  e.preventDefault()
  digits.value = [...text.padEnd(props.length, '').split('').slice(0, props.length)]
  const next = Math.min(text.length, props.length - 1)
  inputs.value[next]?.focus()
}

function reset() {
  digits.value = Array(props.length).fill('')
  focus()
}

function shake() {
  shaking.value = true
  setTimeout(() => { shaking.value = false }, 500)
}

defineExpose({ focus, reset, shake })
</script>

<template>
  <div :class="['sd-otp', { 'sd-otp--shake': shaking }]" @paste="onPaste">
    <input
      v-for="(digit, i) in digits"
      :key="i"
      :ref="el => inputs[i] = el"
      :value="digit"
      class="sd-otp__box"
      :class="{ 'sd-otp__box--filled': digit, 'sd-otp__box--error': error }"
      type="text"
      inputmode="numeric"
      maxlength="1"
      autocomplete="one-time-code"
      @input="onInput(i, $event)"
      @keydown="onKeydown(i, $event)"
    />
  </div>
</template>

<style scoped>
.sd-otp {
  display: flex;
  gap: 10px;
  justify-content: center;
}

@keyframes sd-otp-shake {
  0%, 100% { transform: translateX(0); }
  15%       { transform: translateX(-6px); }
  30%       { transform: translateX(6px); }
  45%       { transform: translateX(-5px); }
  60%       { transform: translateX(5px); }
  75%       { transform: translateX(-3px); }
  90%       { transform: translateX(3px); }
}
.sd-otp--shake { animation: sd-otp-shake 0.48s var(--sd-ease-out); }

.sd-otp__box {
  width: 48px;
  height: 58px;
  border-radius: var(--sd-r-md);
  background: rgba(255, 255, 255, .72);
  border: 1.5px solid rgba(16, 42, 87, .12);
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 24px;
  color: var(--sd-fg1);
  text-align: center;
  outline: none;
  caret-color: transparent;
  transition: border-color var(--sd-dur-fast) var(--sd-ease-out),
              box-shadow var(--sd-dur-fast) var(--sd-ease-out),
              background var(--sd-dur-fast) var(--sd-ease-out);
}
.sd-otp__box:focus {
  background: #fff;
  border-color: var(--sd-azure);
  box-shadow: 0 0 0 4px rgba(111, 147, 181, .22);
}
.sd-otp__box--filled {
  background: #fff;
  border-color: var(--sd-ink);
}
.sd-otp__box--error {
  border-color: var(--sd-danger);
  box-shadow: 0 0 0 4px rgba(192, 88, 78, .15);
}
</style>
