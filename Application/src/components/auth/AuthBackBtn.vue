<script setup>
import { ChevronLeft } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useI18n } from '@/i18n'

const props = defineProps({
  /** Named route or path to navigate to. */
  to: { type: String, required: true },
})

const router = useRouter()
const { t } = useI18n()
</script>

<template>
  <button
    class="back-btn"
    :aria-label="t('common.goBack')"
    @click="router.push(props.to)"
  >
    <ChevronLeft :size="20" :stroke-width="2" />
  </button>
</template>

<style scoped>
.back-btn {
  width: 38px;
  height: 38px;
  border-radius: 999px;
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
  transition: background var(--sd-dur-fast) var(--sd-ease-out),
              transform var(--sd-dur-fast) var(--sd-ease-out);
  flex: none;
  margin-bottom: 20px;
}
.back-btn:hover  { background: rgba(255, 255, 255, .72); }
.back-btn:active { transform: scale(0.93); }
</style>
