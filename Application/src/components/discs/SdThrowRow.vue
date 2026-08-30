<script setup>
import { Star } from 'lucide-vue-next'
import { useI18n } from '@/i18n'

const { t } = useI18n()

defineProps({
  name:     { type: String, required: true },
  time:     { type: String, default: '' },
  rpm:      { type: [String, Number], default: '' },
  fav:      { type: Boolean, default: false },
  auto:     { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
})

defineEmits(['toggle-fav'])
</script>

<template>
  <div class="throw-row">
    <button
      v-if="!readonly"
      type="button"
      class="throw-row__star"
      :aria-label="t('discs.throwDetail.favorite')"
      :aria-pressed="fav"
      @click.stop="$emit('toggle-fav')"
    >
      <Star
        :size="20"
        :stroke-width="2"
        :fill="fav ? 'var(--sd-gold-500)' : 'none'"
        :style="{ color: fav ? 'var(--sd-gold-500)' : 'var(--sd-mist)' }"
      />
    </button>
    <span v-else class="throw-row__star">
      <Star
        :size="20"
        :stroke-width="2"
        :fill="fav ? 'var(--sd-gold-500)' : 'none'"
        :style="{ color: fav ? 'var(--sd-gold-500)' : 'var(--sd-mist)' }"
      />
    </span>
    <div class="throw-row__body">
      <div :class="['throw-row__name', { 'throw-row__name--auto': auto }]">{{ name }}</div>
      <div class="throw-row__time">{{ time }}</div>
    </div>
    <div class="throw-row__metric">
      {{ rpm }}<small>{{ t('discs.throws.rpm') }}</small>
    </div>
  </div>
</template>

<style scoped>
.throw-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--sd-r-md);
  background: rgba(255, 255, 255, .5);
  border: 1px solid rgba(255, 255, 255, .55);
  cursor: pointer;
  transition: background var(--sd-dur-fast) var(--sd-ease-out),
              transform var(--sd-dur-fast) var(--sd-ease-out);
  -webkit-tap-highlight-color: transparent;
  outline: none;
}
.throw-row:active { background: rgba(255, 255, 255, .75); transform: scale(1.02); }

.throw-row__star {
  width: 28px;
  height: 28px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  border-radius: 999px;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}
/* Pointer/touch focus leaves nothing behind; keyboard focus keeps the
   global :focus-visible ring. */
.throw-row__star:focus:not(:focus-visible) {
  outline: none;
  box-shadow: none;
}
button.throw-row__star:active { transform: scale(0.9); }

.throw-row__body { flex: 1; min-width: 0; }

.throw-row__name {
  font-family: var(--sd-font-body);
  font-weight: 600;
  font-size: 15px;
  color: var(--sd-fg1);
  line-height: 1.15;
}
.throw-row__name--auto {
  font-style: italic;
  color: var(--sd-fg2);
  font-weight: 500;
}

.throw-row__time {
  font-family: var(--sd-font-display);
  font-size: 11px;
  color: var(--sd-fg3);
  letter-spacing: 0.02em;
  margin-top: 3px;
}

.throw-row__metric {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 13px;
  color: var(--sd-ink);
  line-height: 1;
  text-align: right;
  flex: none;
}
.throw-row__metric small {
  font-size: 10px;
  color: var(--sd-fg3);
  display: block;
  margin-top: 3px;
  font-weight: 500;
}
</style>
