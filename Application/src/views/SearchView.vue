<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, X } from 'lucide-vue-next'
import AppLayout from '@/layouts/AppLayout.vue'
import SdAvatar from '@/components/ui/SdAvatar.vue'
import { SdChip, SdIconBtn } from '@/components/ui'
import { Star, Eye } from 'lucide-vue-next'

import { sanitizeText } from '@/utils/sanitize'
import { useI18n } from '@/i18n'

const router = useRouter()
const { t } = useI18n()
const query = ref('')

function onSearchInput(e) {
  query.value = sanitizeText(e.target.value)
  e.target.value = query.value
}
</script>

<template>
  <AppLayout :tabs="false">
    <!-- Custom search bar row -->
    <div class="search-bar-row">
      <SdIconBtn variant="glass" class="search-back-btn" @click="router.back()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </SdIconBtn>
      <div class="search-box">
        <Search :size="16" style="color: var(--sd-azure); flex: none;" />
        <input
          :value="query"
          class="search-input"
          :placeholder="t('search.placeholder')"
          maxlength="300"
          autofocus
          @input="onSearchInput"
        />
        <button v-if="query" class="search-clear" @click="query = ''">
          <X :size="16" style="color: var(--sd-fg3);" />
        </button>
      </div>
    </div>

    <!-- Filter chips -->
    <div class="filter-row">
      <SdChip tone="owner">{{ t('search.filterAll', { count: 7 }) }}</SdChip>
      <SdChip tone="solid-light">{{ t('search.filterDiscs', { count: 1 }) }}</SdChip>
      <SdChip tone="solid-light">{{ t('search.filterThrows', { count: 6 }) }}</SdChip>
    </div>

    <!-- Results -->
    <div class="results">
      <p class="results-label">{{ t('search.discsLabel') }}</p>
      <div class="result-row">
        <div class="result-mark">
          <img src="/images/SmartDisc_Mark.png" alt="" style="width: 28px; height: 28px;" />
        </div>
        <div class="result-body">
          <div class="result-name">Sky H<mark>uck</mark>er</div>
          <div class="result-sub">42 {{ t('search.throwsSuffix') }}</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sd-fg3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </div>

      <p class="results-label" style="margin-top: 6px;">{{ t('search.throwsLabel') }}</p>
      <div class="result-row">
        <Star :size="20" :stroke-width="2" style="color: var(--sd-gold-500); flex: none;" />
        <div class="result-body">
          <div class="result-name">Long <mark>huck</mark></div>
          <div class="result-sub">Sky Hammer · {{ t('discs.days.today').toLowerCase() }} · 14:21</div>
        </div>
        <div class="result-metric">1320<small>{{ t('search.rpm') }}</small></div>
      </div>
      <div class="result-row">
        <Star :size="20" :stroke-width="2" style="color: var(--sd-gold-500); flex: none;" />
        <div class="result-body">
          <div class="result-name">Sunset <mark>huck</mark></div>
          <div class="result-sub">Night Owl · {{ t('discs.days.yesterday').toLowerCase() }} · 19:02</div>
        </div>
        <div class="result-metric">1240<small>{{ t('search.rpm') }}</small></div>
      </div>
      <div class="result-row">
        <div style="width: 20px; flex: none;" />
        <div class="result-body">
          <div class="result-name">Endzone <mark>huck</mark></div>
          <div class="result-sub">Team Disc — Reds · {{ t('discs.days.sat') }} · 11:14</div>
        </div>
        <SdChip tone="read">
          <template #icon><Eye :size="12" /></template>
          {{ t('common.read') }}
        </SdChip>
      </div>
    </div>

    <div style="height: 40px;" />
  </AppLayout>
</template>

<style scoped>
.search-bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0 16px;
}
.search-back-btn { flex: none; }


.search-box {
  flex: 1;
  height: 44px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border-radius: var(--sd-r-md);
  background: rgba(255, 255, 255, .72);
  border: 1px solid var(--sd-azure);
  box-shadow: 0 0 0 4px rgba(111, 147, 181, .22);
}

.search-input {
  flex: 1;
  font-family: var(--sd-font-body);
  font-size: 15px;
  color: var(--sd-fg1);
  background: transparent;
  border: none;
  outline: none;
  min-width: 0;
}
.search-input::placeholder { color: var(--sd-fg3); }

.search-clear {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  padding: 0;
}

.filter-row {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.results { display: flex; flex-direction: column; gap: 10px; }

.results-label {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--sd-azure);
  margin: 0;
}

.result-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--sd-r-md);
  background: rgba(255, 255, 255, .5);
  border: 1px solid rgba(255, 255, 255, .55);
}

.result-mark {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(140deg, #1d3d72, #0a1c3d);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.result-body { flex: 1; min-width: 0; }
.result-name {
  font-family: var(--sd-font-body);
  font-weight: 600;
  font-size: 15px;
  color: var(--sd-fg1);
  line-height: 1.15;
}
.result-name :deep(mark) {
  background: rgba(222, 195, 140, .4);
  color: inherit;
  padding: 0 2px;
  border-radius: 3px;
}
.result-sub {
  font-family: var(--sd-font-display);
  font-size: 11px;
  color: var(--sd-fg3);
  margin-top: 3px;
  letter-spacing: 0.02em;
}

.result-metric {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 13px;
  color: var(--sd-ink);
  text-align: right;
  flex: none;
}
.result-metric small {
  font-size: 10px;
  color: var(--sd-fg3);
  display: block;
  margin-top: 3px;
  font-weight: 500;
}
</style>
