<script setup>
import { Activity, Eye, Star } from 'lucide-vue-next'
import SdChip from '@/components/ui/SdChip.vue'
import SdDiscImage from '@/components/discs/SdDiscImage.vue'
import { useI18n } from '@/i18n'

defineProps({
  name:       { type: String, required: true },
  uuid:       { type: String, required: true },
  fav:        { type: Boolean, default: false },
  shared:     { type: Boolean, default: false },
  lastActive: { type: String, default: null },
  imageUrl:   { type: String, default: null },
})

defineEmits(['toggle-fav'])

const { t } = useI18n()
</script>

<template>
  <div class="disc-card">
    <div class="disc-card__top">
      <SdDiscImage
        :image-url="imageUrl"
        :size="48"
        radius="14px"
        :alt="t('discs.photo.alt', { name })"
      />
      <div class="disc-card__info">
        <div class="disc-card__name">{{ name }}</div>
        <div class="disc-card__uuid">{{ uuid }}</div>
        <div v-if="lastActive" class="disc-card__activity">
          <Activity :size="11" />
          <span>{{ lastActive }}</span>
        </div>
      </div>
      <SdChip v-if="shared" tone="read">
        <template #icon><Eye :size="12" /></template>
        {{ t('discs.discCard.read') }}
      </SdChip>
      <div v-else class="disc-card__actions">
        <button
          type="button"
          class="disc-card__fav"
          :aria-pressed="fav"
          @click.stop="$emit('toggle-fav')"
        >
          <Star
            :size="22"
            :stroke-width="2"
            :fill="fav ? 'var(--sd-gold-500)' : 'none'"
            :style="{ color: fav ? 'var(--sd-gold-500)' : 'var(--sd-mist)' }"
          />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.disc-card {
  background: var(--sd-glass-light-bg);
  border: 1px solid var(--sd-glass-light-border);
  -webkit-backdrop-filter: var(--sd-glass-blur);
          backdrop-filter: var(--sd-glass-blur);
  border-radius: var(--sd-r-lg);
  box-shadow: var(--sd-shadow-glass);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  cursor: pointer;
  transition: transform var(--sd-dur-fast) var(--sd-ease-out);
  -webkit-tap-highlight-color: transparent;
  outline: none;
}
.disc-card:active { transform: scale(0.985); }

.disc-card__top {
  display: flex;
  align-items: center;
  gap: 13px;
}

.disc-card__info { flex: 1; min-width: 0; }

.disc-card__name {
  font-family: var(--sd-font-body);
  font-weight: 600;
  font-size: 17px;
  color: var(--sd-fg1);
  line-height: 1.1;
}

.disc-card__uuid {
  font-family: var(--sd-font-display);
  font-size: 11px;
  color: var(--sd-fg3);
  letter-spacing: 0.02em;
  margin-top: 4px;
}

.disc-card__activity {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: var(--sd-font-display);
  font-size: 11px;
  color: var(--sd-fg3);
  margin-top: 5px;
}
.disc-card__activity span { color: var(--sd-success); font-weight: 600; }

.disc-card__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
}

.disc-card__fav {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  margin: -6px;
  display: flex;
  flex: none;
  border-radius: 999px;
  color: var(--sd-mist);
  outline: none;
  -webkit-tap-highlight-color: transparent;
}
.disc-card__fav:active { transform: scale(0.9); }
/* Pointer/touch focus leaves nothing behind; keyboard focus keeps the
   global :focus-visible ring. */
.disc-card__fav:focus:not(:focus-visible) {
  outline: none;
  box-shadow: none;
}
</style>
