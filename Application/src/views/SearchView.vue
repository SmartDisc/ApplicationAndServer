<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, X, Eye, ChevronRight } from 'lucide-vue-next'
import AppLayout from '@/layouts/AppLayout.vue'
import SdDiscImage from '@/components/discs/SdDiscImage.vue'
import SdThrowRow from '@/components/discs/SdThrowRow.vue'
import { SdChip, SdIconBtn } from '@/components/ui'

import { sanitizeText } from '@/utils/sanitize'
import { useDiscs } from '@/composables/useDiscs'
import { useThrows, formatThrowTime } from '@/composables/useThrows'
import { useI18n } from '@/i18n'

const router = useRouter()
const { t } = useI18n()
const { discs, sharedDiscs, fetchDiscs, fetchSharedDiscs } = useDiscs()
const { getThrows, fetchThrows } = useThrows()

const query = ref('')
// All / discs-only / throws-only, mirroring DiscStatsView's chip pattern.
const filter = ref('all')

function onSearchInput(e) {
  query.value = sanitizeText(e.target.value)
  e.target.value = query.value
}

onMounted(() => {
  // Match MyDiscsView/SharedView: fetch unconditionally, no "already loaded"
  // guard. Once the disc lists resolve, pull every disc's throws once (in
  // parallel, Promise.allSettled so one disc's failure doesn't sink the rest)
  // so typing filters the already-cached data locally and instantly.
  fetchDiscs()
    .then(() => Promise.allSettled(discs.value.map(d => fetchThrows(d.id))))
    .catch(() => {})
  fetchSharedDiscs()
    .then(() => Promise.allSettled(sharedDiscs.value.map(d => fetchThrows(d.id))))
    .catch(() => {})
})

// A single flat view of every accessible disc, tagged with whether it's shared,
// so disc/throw results can render the read-only chip and route correctly.
const allDiscs = computed(() => [
  ...discs.value.map(d => ({ ...d, shared: false })),
  ...sharedDiscs.value.map(d => ({ ...d, shared: true })),
])

/** Splits a name into { before, match, after } around the first case-insensitive
 * match of `q`, so the template can wrap `match` in <mark> without v-html. */
function highlight(name, q) {
  const src = name ?? ''
  const needle = q.trim().toLowerCase()
  if (!needle) return { before: src, match: '', after: '' }
  const idx = src.toLowerCase().indexOf(needle)
  if (idx === -1) return { before: src, match: '', after: '' }
  return {
    before: src.slice(0, idx),
    match: src.slice(idx, idx + needle.length),
    after: src.slice(idx + needle.length),
  }
}

const trimmedQuery = computed(() => query.value.trim())
const hasQuery = computed(() => trimmedQuery.value.length > 0)

// Disc results: case-insensitive substring on name, sorted alphabetically.
const discResults = computed(() => {
  if (!hasQuery.value) return []
  const q = trimmedQuery.value.toLowerCase()
  return allDiscs.value
    .filter(d => (d.name ?? '').toLowerCase().includes(q))
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
})

// Throw results: every accessible disc's cached throws (already newest-first),
// filtered by name; keep the owning disc's name + shared flag for the subtitle
// and routing.
const throwResults = computed(() => {
  if (!hasQuery.value) return []
  const q = trimmedQuery.value.toLowerCase()
  const rows = []
  for (const disc of allDiscs.value) {
    for (const thr of getThrows(disc.id)) {
      if ((thr.name ?? '').toLowerCase().includes(q)) {
        rows.push({ thr, discId: disc.id, discName: disc.name, shared: disc.shared })
      }
    }
  }
  return rows
})

const allResultsCount = computed(() => discResults.value.length + throwResults.value.length)

const showDiscs = computed(() => filter.value === 'all' || filter.value === 'discs')
const showThrows = computed(() => filter.value === 'all' || filter.value === 'throws')

const FILTERS = [
  { key: 'all', label: 'search.filterAll', count: () => allResultsCount.value },
  { key: 'discs', label: 'search.filterDiscs', count: () => discResults.value.length },
  { key: 'throws', label: 'search.filterThrows', count: () => throwResults.value.length },
]

function discSubtitle(discId) {
  const throws = getThrows(discId)
  if (!throws.length) return t('search.throwsCount', { count: 0 })
  const day = t('discs.days.' + throws[0].day).toLowerCase()
  return t('search.throwsSuffix', { count: throws.length, day })
}

function openDisc(disc) {
  router.push(disc.shared ? `/shared/${disc.id}` : `/discs/${disc.id}`)
}

function openThrow(row) {
  const base = row.shared ? '/shared' : '/discs'
  router.push(`${base}/${row.discId}/throw/${row.thr.id}`)
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
      <button
        v-for="f in FILTERS"
        :key="f.key"
        type="button"
        class="chip-btn"
        :aria-pressed="filter === f.key"
        @click="filter = f.key"
      >
        <SdChip :tone="filter === f.key ? 'owner' : 'solid-light'">{{ t(f.label, { count: f.count() }) }}</SdChip>
      </button>
    </div>

    <!-- Empty-query prompt -->
    <div v-if="!hasQuery" class="search-hint">{{ t('search.prompt') }}</div>

    <!-- No matches -->
    <div v-else-if="allResultsCount === 0" class="search-hint">{{ t('search.noResults') }}</div>

    <!-- Results -->
    <div v-else class="results">
      <template v-if="showDiscs && discResults.length">
        <p class="results-label">{{ t('search.discsLabel') }}</p>
        <button
          v-for="disc in discResults"
          :key="disc.id"
          type="button"
          class="result-row"
          @click="openDisc(disc)"
        >
          <SdDiscImage :image-url="disc.imageUrl" :size="38" radius="10px" :alt="disc.name" />
          <div class="result-body">
            <div class="result-name">
              <template v-if="highlight(disc.name, trimmedQuery).match">{{ highlight(disc.name, trimmedQuery).before }}<mark>{{ highlight(disc.name, trimmedQuery).match }}</mark>{{ highlight(disc.name, trimmedQuery).after }}</template>
              <template v-else>{{ disc.name }}</template>
            </div>
            <div class="result-sub">{{ discSubtitle(disc.id) }}</div>
          </div>
          <SdChip v-if="disc.shared" tone="read">
            <template #icon><Eye :size="12" /></template>
            {{ t('common.read') }}
          </SdChip>
          <ChevronRight v-else :size="16" style="color: var(--sd-fg3); flex: none;" />
        </button>
      </template>

      <template v-if="showThrows && throwResults.length">
        <p class="results-label" :style="showDiscs && discResults.length ? 'margin-top: 6px;' : ''">{{ t('search.throwsLabel') }}</p>
        <!-- Shared throws show the read-only chip in place of the RPM metric,
             matching the shared-disc convention; SdThrowRow has no chip slot,
             so the chip is layered over the row (RPM suppressed to avoid it). -->
        <div
          v-for="row in throwResults"
          :key="row.discId + '/' + row.thr.id"
          class="throw-result"
        >
          <SdThrowRow
            readonly
            :name="row.thr.name"
            :time="row.discName + ' · ' + formatThrowTime(t, row.thr)"
            :rpm="row.shared ? '' : (row.thr.rpm ?? '')"
            :fav="row.thr.fav"
            :auto="row.thr.auto"
            @click="openThrow(row)"
          />
          <SdChip v-if="row.shared" tone="read" class="throw-result__chip">
            <template #icon><Eye :size="12" /></template>
            {{ t('common.read') }}
          </SdChip>
        </div>
      </template>
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

.chip-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  outline: none;
  border-radius: var(--sd-r-pill);
  -webkit-tap-highlight-color: transparent;
}
.chip-btn:active { transform: scale(0.94); }

.search-hint {
  font-family: var(--sd-font-display);
  font-size: 13px;
  color: var(--sd-fg3);
  text-align: center;
  padding: 32px 12px;
  letter-spacing: 0.02em;
}

.results { display: flex; flex-direction: column; gap: 10px; }

.throw-result { position: relative; }
.throw-result__chip {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

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
  width: 100%;
  text-align: left;
  cursor: pointer;
  transition: background var(--sd-dur-fast) var(--sd-ease-out),
              transform var(--sd-dur-fast) var(--sd-ease-out);
  -webkit-tap-highlight-color: transparent;
  outline: none;
}
.result-row:active { background: rgba(255, 255, 255, .75); transform: scale(1.02); }

.result-body { flex: 1; min-width: 0; }
.result-name {
  font-family: var(--sd-font-body);
  font-weight: 600;
  font-size: 15px;
  color: var(--sd-fg1);
  line-height: 1.15;
}
.result-name :deep(mark),
.result-name mark {
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
</style>
