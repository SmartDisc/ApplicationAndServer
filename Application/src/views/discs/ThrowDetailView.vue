<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SdAppBar from '@/components/ui/SdAppBar.vue'
import SdStatTile from '@/components/ui/SdStatTile.vue'
import SdThrowChart from '@/components/discs/SdThrowChart.vue'
import { SdBtn, SdChip, SdIconBtn, SdBottomSheet, SdField } from '@/components/ui'
import { Pencil, MoreHorizontal, Share2, Home, Trash2, AlertTriangle } from 'lucide-vue-next'
import { useDiscs } from '@/composables/useDiscs'
import { useThrows, formatThrowTime } from '@/composables/useThrows'
import { mapAuthError } from '@/stores/auth'
import { sanitizeText } from '@/utils/sanitize'
import { useI18n } from '@/i18n'

const route = useRoute()
const router = useRouter()
const { getDisc } = useDiscs()
const { getThrows, fetchThrows, renameThrow, deleteThrow } = useThrows()
const { t } = useI18n()

const cameFromRecording = computed(() => route.query.justRecorded === '1')
const disc = computed(() => getDisc(route.params.id))
const throw_ = computed(() =>
  getThrows(route.params.id).find(th => String(th.id) === String(route.params.throwId)) ?? null
)

onMounted(() => {
  // Covers direct navigation to this view before the throws list was fetched.
  fetchThrows(route.params.id).catch(() => {
    // throw_ just stays null if this fails; template falls back to placeholders
  })
})

// ── Rename (persisted on the backend) ─────────────────────────────────────
const renameSheet = ref(false)
const renameValue = ref('')
const renameError = ref('')
const renameLoading = ref(false)

function openRenameSheet() {
  renameValue.value = throw_.value?.name ?? ''
  renameError.value = ''
  renameSheet.value = true
}

async function handleRename() {
  const name = renameValue.value.trim()
  if (!name || renameLoading.value) return
  renameLoading.value = true
  renameError.value = ''
  try {
    await renameThrow(route.params.id, route.params.throwId, name)
    renameSheet.value = false
  } catch (err) {
    renameError.value = mapAuthError(err, t)
  } finally {
    renameLoading.value = false
  }
}

// ── Delete (persisted on the backend) ──────────────────────────────────────
const deleteSheet = ref(false)
const deleteLoading = ref(false)
const deleteError = ref('')

function openDeleteSheet() {
  deleteError.value = ''
  deleteSheet.value = true
}

async function handleDelete() {
  if (deleteLoading.value) return
  deleteLoading.value = true
  deleteError.value = ''
  try {
    await deleteThrow(route.params.id, route.params.throwId)
    router.push(`/discs/${route.params.id}`)
  } catch (err) {
    deleteError.value = mapAuthError(err, t)
  } finally {
    deleteLoading.value = false
  }
}

const throwTime   = computed(() => (throw_.value ? formatThrowTime(t, throw_.value) : ''))
const durationS   = computed(() => (throw_.value ? `${(throw_.value.durationMs / 1000).toFixed(1)}s` : '—'))
const maxAlt      = computed(() => (throw_.value?.maxAltM != null ? `${throw_.value.maxAltM.toFixed(2)}m` : '—'))
const avgTemp     = computed(() => (throw_.value?.avgTempC != null ? `${throw_.value.avgTempC.toFixed(1)}°C` : '—'))
const recordedAt  = computed(() => (throw_.value?.recordedAt ? new Date(throw_.value.recordedAt).toLocaleString() : '—'))
</script>

<template>
  <div class="throw-screen">
    <div class="throw-bg">
      <div class="throw-bg__b1" />
      <div class="throw-bg__b2" />
    </div>

    <div class="throw-content">
      <SdAppBar back :back-to="cameFromRecording ? `/discs/${route.params.id}` : ''">
        <template #action>
          <SdIconBtn v-if="cameFromRecording" variant="glass" :to="`/discs/${route.params.id}`" class="throw-home-btn">
            <Home :size="18" :stroke-width="1.75" />
          </SdIconBtn>
        </template>
      </SdAppBar>

      <div class="throw-header">
        <div class="throw-title-row">
          <h1 class="throw-title">
            {{ throw_?.name ?? t('discs.throwDetail.defaultName') }}
          </h1>
          <button type="button" class="throw-edit" @click="openRenameSheet">
            <Pencil :size="14" :stroke-width="1.75" style="color: var(--sd-fg2-on-dark);" />
          </button>
        </div>
        <p class="throw-time">{{ throwTime }}</p>
      </div>

      <!-- Rename sheet -->
      <SdBottomSheet v-model="renameSheet" :title="t('discs.throwDetail.renameSheetTitle')">
        <div class="rename-stack">
          <SdField
            v-model="renameValue"
            :label="t('discs.throwDetail.renameLabel')"
            :sanitize="sanitizeText"
            :maxlength="60"
            :error="renameError"
          />
          <div class="rename-actions">
            <SdBtn variant="ghost" size="md" style="flex:1;" @click="renameSheet = false">
              {{ t('common.cancel') }}
            </SdBtn>
            <SdBtn
              variant="primary"
              size="md"
              style="flex:1;"
              :disabled="!renameValue.trim() || renameLoading"
              @click="handleRename"
            >
              {{ renameLoading ? t('discs.throwDetail.renaming') : t('common.save') }}
            </SdBtn>
          </div>
        </div>
      </SdBottomSheet>

      <!-- Stats: two stacked rows on phones, one combined row ≥768px -->
      <div class="stat-rows">
        <div class="stat-row stat-row--primary">
          <SdStatTile dark :v="throw_?.rpm ?? '—'" :k="t('discs.throwDetail.rpm')" />
          <SdStatTile dark :v="durationS" :k="t('discs.throwDetail.duration')" />
          <SdStatTile dark :v="maxAlt" :k="t('discs.throwDetail.maxAltitude')" />
        </div>

        <div class="stat-row stat-row--secondary">
          <SdStatTile dark :v="avgTemp" :k="t('discs.throwDetail.avgTemp')" />
          <SdStatTile dark :v="recordedAt" :k="t('discs.throwDetail.recordedAt')" />
        </div>
      </div>

      <div v-if="throw_?.series?.length" class="throw-charts">
        <SdThrowChart :series="throw_.series" metric="rpm" :title="t('discs.throwDetail.spinChart')" />
        <SdThrowChart :series="throw_.series" metric="alt" :title="t('discs.throwDetail.altitudeChart')" />
      </div>

      <div class="throw-meta">
        <span v-if="throw_?.recordedByName">{{ t('discs.throwDetail.recordedBy', { name: throw_.recordedByName }) }}</span>
        <span v-if="throw_?.sampleCount != null">{{ t('discs.throwDetail.sampleCount', { count: throw_.sampleCount }) }}</span>
      </div>

      <!-- Actions -->
      <div class="throw-actions">
        <SdBtn variant="gold" size="md" block>
          <template #icon-left><Share2 :size="16" :stroke-width="1.75" /></template>
          {{ t('discs.throwDetail.share') }}
        </SdBtn>
        <SdBtn variant="dark-glass" size="md" class="delete-trigger-btn" @click="openDeleteSheet">
          <template #icon-left><Trash2 :size="16" :stroke-width="1.75" /></template>
          {{ t('discs.throwDetail.delete') }}
        </SdBtn>
      </div>

      <!-- Delete sheet -->
      <SdBottomSheet v-model="deleteSheet" :title="t('discs.throwDetail.deleteSheetTitle')">
        <div class="delete-stack">
          <div class="delete-header">
            <div class="delete-header__icon">
              <AlertTriangle :size="18" :stroke-width="1.75" />
            </div>
            <div>
              <p class="delete-header__eyebrow">{{ t('discs.throwDetail.deleteWarningEyebrow') }}</p>
              <p class="delete-header__sub">{{ t('discs.throwDetail.deleteWarningBody') }}</p>
            </div>
          </div>
          <p v-if="deleteError" class="delete-error">{{ deleteError }}</p>
          <div class="delete-actions">
            <SdBtn variant="ghost" size="md" style="flex:1;" @click="deleteSheet = false">
              {{ t('common.cancel') }}
            </SdBtn>
            <SdBtn
              variant="primary"
              size="md"
              style="flex:1;"
              class="danger-confirm-btn"
              :disabled="deleteLoading"
              @click="handleDelete"
            >
              {{ deleteLoading ? t('discs.throwDetail.deleting') : t('discs.throwDetail.deleteThrow') }}
            </SdBtn>
          </div>
        </div>
      </SdBottomSheet>
    </div>
  </div>
</template>

<style scoped>
.throw-screen {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--sd-ink-900);
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: center;
  padding-left: env(safe-area-inset-left, 0);
  padding-right: env(safe-area-inset-right, 0);
}

.throw-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
}
.throw-bg__b1 {
  position: absolute;
  width: 380px;
  height: 380px;
  left: -120px;
  top: -120px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(111, 147, 181, .30), transparent 65%);
}
.throw-bg__b2 {
  position: absolute;
  width: 360px;
  height: 360px;
  right: -140px;
  top: 28%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(222, 195, 140, .28), transparent 60%);
}

.throw-content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: var(--sd-content-max);
  display: flex;
  flex-direction: column;
  padding: 0 var(--sd-gutter) 32px;
  padding-top: env(safe-area-inset-top, 0);
}

/* Override AppBar styles for dark background */
.throw-content :deep(.appbar__back) {
  background: rgba(255, 255, 255, .12);
  border-color: rgba(255, 255, 255, .18);
  color: #fff;
}
.throw-content :deep(.appbar__title) {
  color: var(--sd-fg-on-dark);
}
.throw-content :deep(.throw-home-btn) {
  background: rgba(255, 255, 255, .12);
  border-color: rgba(255, 255, 255, .18);
  color: #fff;
}

.dark-icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .12);
  border: 1px solid rgba(255, 255, 255, .18);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: pointer;
}

.throw-eyebrow {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--sd-gold-300);
  margin: 0 0 8px;
}
.throw-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.throw-title {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 26px;
  letter-spacing: -0.01em;
  color: #fff;
  margin: 0 0 4px;
  line-height: 1.05;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.throw-title__badge {
  font-size: 10px;
  vertical-align: middle;
}
.throw-edit {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  margin: -6px 0 4px;
  display: flex;
  flex: none;
  border-radius: 999px;
}
.throw-edit:active { transform: scale(0.9); }

.rename-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 4px;
}

.rename-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}
.throw-time {
  font-family: var(--sd-font-body);
  font-size: 13px;
  color: var(--sd-fg2-on-dark);
  margin: 0 0 14px;
}

.stat-row {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

/* ≥768px: widen the column and let all five stat tiles share one row */
@media (min-width: 768px) {
  .throw-content {
    max-width: var(--sd-content-max-md);
    padding-left: 32px;
    padding-right: 32px;
  }

  .stat-rows {
    display: flex;
    gap: 10px;
    margin-bottom: 14px;
  }
  .stat-row {
    margin-bottom: 0;
  }
  /* 3 + 2 tiles → equal widths across the combined row */
  .stat-row--primary { flex: 3; }
  .stat-row--secondary { flex: 2; }
}

.throw-charts {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

@media (min-width: 768px) {
  .throw-charts {
    flex-direction: row;
  }
  .throw-charts > * {
    flex: 1;
    min-width: 0;
  }
}

.throw-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: var(--sd-font-body);
  font-size: 12px;
  color: var(--sd-fg2-on-dark);
  margin: 0 0 18px;
}

.throw-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.delete-trigger-btn {
  flex: none;
  padding-left: 14px;
  padding-right: 14px;
  color: var(--sd-danger);
}

.delete-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 4px;
}

.delete-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 2px;
}

.delete-header__icon {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(192, 88, 78, .12);
  color: var(--sd-danger);
}

.delete-header__eyebrow {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--sd-danger);
  margin: 0 0 2px;
}

.delete-header__sub {
  font-family: var(--sd-font-body);
  font-size: 13px;
  color: var(--sd-fg1);
  margin: 0;
  line-height: 1.4;
}

.delete-error {
  font-family: var(--sd-font-body);
  font-size: 13px;
  color: var(--sd-danger);
  margin: 0;
}

.delete-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.danger-confirm-btn {
  background: var(--sd-danger) !important;
  color: #fff !important;
}

.danger-confirm-btn:not(:disabled):hover {
  opacity: 0.9;
}
</style>
