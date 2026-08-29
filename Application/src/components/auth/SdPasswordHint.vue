<script setup>
import { computed } from 'vue'
import { Check, X } from 'lucide-vue-next'
import { passwordRules } from '@/utils/validate'
import { useI18n } from '@/i18n'

const props = defineProps({
  value: { type: String, default: '' },
})

const { t } = useI18n()
const rules = computed(() => passwordRules(props.value, t))
</script>

<template>
  <div class="hint">
    <p class="hint__title">{{ t('passwordHint.title') }}</p>
    <ul class="hint__list">
      <li
        v-for="rule in rules"
        :key="rule.label"
        :class="['hint__item', { 'hint__item--ok': rule.ok }]"
      >
        <span class="hint__icon">
          <Check v-if="rule.ok"  :size="12" :stroke-width="2.5" />
          <X     v-else          :size="12" :stroke-width="2.5" />
        </span>
        {{ rule.label }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.hint {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 10;
  background: var(--sd-glass-light-bg);
  border: 1px solid var(--sd-glass-light-border);
  -webkit-backdrop-filter: var(--sd-glass-blur-thin);
          backdrop-filter: var(--sd-glass-blur-thin);
  border-radius: var(--sd-r-md);
  box-shadow: var(--sd-shadow-glass);
  padding: 12px 14px;
  animation: hint-in var(--sd-dur-fast) var(--sd-ease-out);
}

@keyframes hint-in {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.hint__title {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--sd-fg2);
  margin: 0 0 8px;
}

.hint__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hint__item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--sd-font-display);
  font-size: 13px;
  color: var(--sd-fg3);
  transition: color var(--sd-dur-fast) var(--sd-ease-out);
}

.hint__item--ok { color: var(--sd-success); }

.hint__icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  background: rgba(16, 42, 87, .08);
  color: var(--sd-fg3);
  transition: background var(--sd-dur-fast) var(--sd-ease-out),
              color var(--sd-dur-fast) var(--sd-ease-out);
}

.hint__item--ok .hint__icon {
  background: rgba(63, 157, 109, .15);
  color: var(--sd-success);
}
</style>
