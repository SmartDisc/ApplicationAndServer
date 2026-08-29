<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SdAppBar from '@/components/ui/SdAppBar.vue'
import SdStatTile from '@/components/ui/SdStatTile.vue'
import { SdBtn, SdChip } from '@/components/ui'
import {
  AlertTriangle,
  Battery,
  BluetoothConnected,
  Circle,
  Loader2,
  Square,
} from 'lucide-vue-next'
import { useDiscBle } from '@/composables/useDiscBle'
import { useDiscs } from '@/composables/useDiscs'
import { useThrows } from '@/composables/useThrows'
import { usePreferences } from '@/composables/usePreferences'
import { convertDistance, distanceUnitLabel } from '@/utils/units'
import { useI18n } from '@/i18n'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { getDisc } = useDiscs()
const { saveThrow } = useThrows()
const { distanceUnit } = usePreferences()

const disc = computed(() => getDisc(route.params.id))

const {
  connectionState,
  connectionErrorCode,
  isConnected,
  deviceName,
  batteryPercent,
  deviceState,
  lowBattery,
  isStreaming,
  latest,
  isRecording,
  connect,
  disconnect,
  startRecording,
  stopRecording,
} = useDiscBle()

const DEVICE_STATE_KEYS = ['booting', 'sensorStandby', 'ready', 'streaming', 'inFlight', 'dfu', 'poweringOff']

const deviceStateKey = computed(() =>
  deviceState.value != null ? DEVICE_STATE_KEYS[deviceState.value] ?? null : null
)

const batteryDisplay = computed(() =>
  batteryPercent.value != null ? `${Math.round(batteryPercent.value)}%` : null
)

const altDisplay = computed(() =>
  latest.value?.altitudeM != null ? convertDistance(latest.value.altitudeM, distanceUnit.value) : null
)
const altUnit = computed(() => distanceUnitLabel(distanceUnit.value))

const rpmDisplay = computed(() =>
  latest.value?.rpm != null ? Math.round(latest.value.rpm) : '—'
)

async function attemptConnect() {
  try {
    await connect()
  } catch {
    // connectionErrorCode already reflects the failure for the template
  }
}

onMounted(() => {
  attemptConnect()
})

onUnmounted(() => {
  stopElapsedTimer()
  if (isConnected.value) {
    disconnect().catch(() => {
      // nothing more we can do from an unmounted view
    })
  }
})

function retry() {
  saveError.value = null
  attemptConnect()
}

// ── Elapsed recording timer ────────────────────────────────────────────────
const elapsedMs = ref(0)
let elapsedTimer = null
let recordingStartedAt = 0

function startElapsedTimer() {
  recordingStartedAt = Date.now()
  elapsedMs.value = 0
  elapsedTimer = setInterval(() => {
    elapsedMs.value = Date.now() - recordingStartedAt
  }, 200)
}

function stopElapsedTimer() {
  if (elapsedTimer) {
    clearInterval(elapsedTimer)
    elapsedTimer = null
  }
}

const elapsedDisplay = computed(() => `${(elapsedMs.value / 1000).toFixed(1)}s`)

// ── Record / stop / save ───────────────────────────────────────────────────
const saving = ref(false)
const saveError = ref(null)
const interrupted = ref(false)
let stoppingSelf = false

function onRecordToggle() {
  if (!isConnected.value || saving.value) return
  if (isRecording.value) {
    stopAndSave()
  } else {
    saveError.value = null
    interrupted.value = false
    startRecording()
    startElapsedTimer()
  }
}

async function stopAndSave() {
  stoppingSelf = true
  stopElapsedTimer()
  const summary = stopRecording()
  // Let the isRecording watcher below observe the flip before we clear the flag.
  await nextTick()
  stoppingSelf = false

  if (!summary) return

  saving.value = true
  saveError.value = null
  try {
    const saved = await saveThrow(route.params.id, summary)
    router.push({ path: `/discs/${route.params.id}/throw/${saved.id}`, query: { justRecorded: '1' } })
  } catch {
    saveError.value = t('discs.live.saveError')
  } finally {
    saving.value = false
  }
}

// The composable can stop recording on its own (e.g. an unexpected
// disconnect discards the in-progress buffer) — distinguish that from our
// own stop-button flow via `stoppingSelf` so we don't try to save a summary
// that no longer exists.
watch(isRecording, (recording, wasRecording) => {
  if (wasRecording && !recording && !stoppingSelf) {
    stopElapsedTimer()
    interrupted.value = true
  }
})
</script>

<template>
  <div class="live-screen">
    <div class="live-bg">
      <div class="live-bg__b1" />
      <div class="live-bg__b2" />
    </div>

    <div class="live-content">
      <SdAppBar back />

      <div class="live-header">
        <div class="live-eyebrow">{{ t('discs.live.eyebrow') }}</div>
        <div class="live-title-row">
          <h1 class="live-title">{{ disc?.name ?? t('discs.live.title') }}</h1>
          <SdChip v-if="deviceName" tone="solid-light" class="live-title__device">
            <template #icon><BluetoothConnected :size="15" /></template>
            {{ deviceName }}
          </SdChip>
        </div>
      </div>

      <!-- Connection status -->
      <div v-if="connectionState === 'connecting' || connectionState === 'scanning'" class="live-status">
        <Loader2 :size="20" :stroke-width="2" class="live-spinner" />
        <span>{{ t('discs.live.connecting') }}</span>
      </div>

      <div v-else-if="connectionErrorCode" class="live-status live-status--error">
        <SdChip tone="neutral" class="live-error-chip">
          <template #icon><AlertTriangle :size="12" /></template>
          <p>{{ t(`discs.live.errors.${connectionErrorCode}`) }}</p>
        </SdChip>
        <SdBtn variant="dark-glass" size="sm" @click="retry">{{ t('discs.live.retry') }}</SdBtn>
      </div>

      <div v-else-if="isConnected" class="live-device">
        <div class="live-device__row">
          <SdChip v-if="batteryDisplay" :tone="lowBattery ? 'gold' : 'neutral'">
            <template #icon><Battery :size="12" /></template>
            {{ batteryDisplay }}
          </SdChip>
        </div>
        <p v-if="lowBattery" class="live-lowbattery">{{ t('discs.live.lowBattery') }}</p>
      </div>

      <p v-if="interrupted" class="live-inline-error">{{ t('discs.live.interrupted') }}</p>
      <p v-if="saveError" class="live-inline-error">{{ saveError }}</p>

      <!-- Live telemetry -->
      <div v-if="isConnected && isStreaming && latest" class="live-telemetry">
        <div class="live-hero">
          <SdStatTile dark :v="rpmDisplay" :k="t('discs.live.rpm')" />
        </div>
        <div class="live-secondary-row">
          <SdStatTile dark :v="altDisplay ?? '—'" :u="altDisplay != null ? altUnit : ''" :k="t('discs.live.altitude')" />
        </div>
      </div>
      <div v-else-if="isConnected" class="live-placeholder">
        <p>{{ t('discs.live.waitingForData') }}</p>
      </div>

      <!-- Recording indicator -->
      <div v-if="isRecording" class="live-recording">
        <span class="live-recording__dot" />
        <span>{{ t('discs.live.recording') }} · {{ elapsedDisplay }}</span>
      </div>
      <div v-else-if="saving" class="live-recording">
        <span>{{ t('discs.live.saving') }}</span>
      </div>

      <div class="live-actions">
        <SdBtn
          variant="gold"
          size="lg"
          block
          :disabled="!isConnected"
          @click="onRecordToggle"
        >
          <template #icon-left>
            <Square v-if="isRecording" :size="18" :stroke-width="2" />
            <Circle v-else :size="18" :stroke-width="2" fill="currentColor" />
          </template>
          {{ isRecording ? t('discs.live.stop') : t('discs.live.record') }}
        </SdBtn>
      </div>
    </div>
  </div>
</template>

<style scoped>
.live-screen {
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

.live-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
}
.live-bg__b1 {
  position: absolute;
  width: 380px;
  height: 380px;
  left: -120px;
  top: -120px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(111, 147, 181, .30), transparent 65%);
}
.live-bg__b2 {
  position: absolute;
  width: 360px;
  height: 360px;
  right: -140px;
  top: 28%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(222, 195, 140, .28), transparent 60%);
}

.live-content {
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
.live-content :deep(.appbar__back) {
  background: rgba(255, 255, 255, .12);
  border-color: rgba(255, 255, 255, .18);
  color: #fff;
}
.live-content :deep(.appbar__title) {
  color: var(--sd-fg-on-dark);
}
.live-content :deep(.live-error-chip) {
  color: #ff9c9c;
  background: rgba(255, 90, 90, .12);
  border: 1px solid rgba(255, 90, 90, .25);
  white-space: normal;
  text-align: left;
}

@media (min-width: 768px) {
  .live-content {
    max-width: var(--sd-content-max-md);
    padding-left: 32px;
    padding-right: 32px;
  }
}

.live-eyebrow {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--sd-gold-300);
  margin: 0 0 8px;
}
.live-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0 0 18px;
}
.live-title {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 26px;
  letter-spacing: -0.01em;
  color: #fff;
  margin: 0;
  line-height: 1.05;
}
.live-title__device {
  flex: none;
  font-size: 14px;
  padding: 7px 12px;
}

.live-status {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--sd-font-body);
  font-size: 14px;
  color: var(--sd-fg2-on-dark);
  margin: 0 0 18px;
}
.live-status--error {
  flex-wrap: wrap;
  justify-content: space-between;
}

.live-spinner {
  color: var(--sd-gold-300);
  animation: live-spin 0.9s linear infinite;
}
@keyframes live-spin {
  to { transform: rotate(360deg); }
}

.live-device {
  margin: 0 0 18px;
}
.live-device__row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.live-lowbattery {
  font-family: var(--sd-font-body);
  font-size: 12.5px;
  color: var(--sd-gold-300);
  margin: 8px 0 0;
}

.live-inline-error {
  font-family: var(--sd-font-body);
  font-size: 13px;
  color: #ff9c9c;
  background: rgba(255, 90, 90, .12);
  border: 1px solid rgba(255, 90, 90, .25);
  border-radius: var(--sd-r-md);
  padding: 10px 12px;
  margin: 0 0 14px;
}

.live-telemetry {
  margin: 8px 0 20px;
}
.live-hero {
  display: flex;
  margin-bottom: 10px;
}
.live-hero :deep(.stat-tile) {
  padding: 22px 20px;
}
.live-hero :deep(.stat-tile__v) {
  font-size: 44px;
}
.live-secondary-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.live-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 120px;
  border-radius: var(--sd-r-lg);
  background: rgba(255, 255, 255, .05);
  border: 1px dashed rgba(255, 255, 255, .16);
  margin: 8px 0 20px;
  padding: 20px;
}
.live-placeholder p {
  font-family: var(--sd-font-body);
  font-size: 13.5px;
  color: var(--sd-fg2-on-dark);
  margin: 0;
}

.live-recording {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.03em;
  color: #fff;
  margin: 0 0 12px;
}
.live-recording__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #ff5a5a;
  animation: live-pulse 1.1s ease-in-out infinite;
}
@keyframes live-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.75); }
}

.live-actions {
  margin-top: auto;
  padding-top: 8px;
}
</style>
