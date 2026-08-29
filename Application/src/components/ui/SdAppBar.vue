<script setup>
import { ChevronLeft } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const props = defineProps({
  back:   { type: Boolean, default: false },
  title:  { type: String, default: '' },
  backTo: { type: String, default: '' },
})

const router = useRouter()

function onBack() {
  if (props.backTo) {
    router.push(props.backTo)
  } else {
    router.back()
  }
}
</script>

<template>
  <div class="appbar">
    <button v-if="back" class="appbar__back" @click="onBack">
      <ChevronLeft :size="18" :stroke-width="2" />
    </button>
    <div v-else class="appbar__spacer" />

    <div class="appbar__title">{{ title }}</div>

    <div class="appbar__action">
      <slot name="action">
        <div class="appbar__spacer" />
      </slot>
    </div>
  </div>
</template>

<style scoped>
.appbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0 18px;
  flex: none;
  margin-top: 10px;
}

.appbar__back {
  width: 38px;
  height: 38px;
  border-radius: var(--sd-r-pill);
  background: var(--sd-glass-light-bg);
  border: 1px solid var(--sd-glass-light-border);
  -webkit-backdrop-filter: var(--sd-glass-blur-thin);
          backdrop-filter: var(--sd-glass-blur-thin);
  box-shadow: var(--sd-shadow-glass);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sd-ink);
  cursor: pointer;
  flex: none;
}

.appbar__title {
  flex: 1;
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 17px;
  color: var(--sd-fg1);
  letter-spacing: -0.005em;
  text-align: center;
}

.appbar__spacer {
  width: 38px;
  flex: none;
}

.appbar__action {
  flex: none;
  display: flex;
  align-items: center;
}
</style>
