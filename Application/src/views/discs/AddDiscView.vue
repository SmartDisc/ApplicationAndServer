<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Hash, Lock, Check, ScanLine, Keyboard, Info } from 'lucide-vue-next'
import AppLayout from '@/layouts/AppLayout.vue'
import SdAppBar from '@/components/ui/SdAppBar.vue'
import { SdBtn, SdField } from '@/components/ui'
import QrScanner from '@/components/discs/QrScanner.vue'
import { sanitizeUUID, sanitizePassword } from '@/utils/sanitize'
import { parsePairingPayload } from '@/utils/pairing'
import { useDiscs } from '@/composables/useDiscs'
import { mapAuthError } from '@/stores/auth'
import { useI18n } from '@/i18n'

const router = useRouter()
const { t } = useI18n()
const { claimDisc } = useDiscs()

// Desktop/dev browsers without a camera (and any WebView build missing
// getUserMedia) fall straight to manual entry rather than showing a scanner
// that can never succeed.
const cameraSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
const mode = ref(cameraSupported ? 'scan' : 'manual')

const uuid = ref('')
const password = ref('')
const pairing = ref(false)
const pairError = ref('')
const scanError = ref('')

// Avoids re-submitting the same still-visible QR code on every decoded frame
// once it has already been attempted (success moves away from this screen;
// failure is shown via pairError until a different code is scanned).
let lastScannedText = null

async function pair(id, pass) {
  if (pairing.value) return
  pairing.value = true
  pairError.value = ''
  try {
    const claimedDisc = await claimDisc(id, pass)
    router.push(`/discs/${claimedDisc.id}/paired`)
  } catch (err) {
    pairError.value = mapAuthError(err, t)
  } finally {
    pairing.value = false
  }
}

function handlePairDisc() {
  if (!uuid.value || !password.value) return
  pair(uuid.value, password.value)
}

function handleDecode(text) {
  if (text === lastScannedText) return

  const parsed = parsePairingPayload(text)
  if (!parsed) {
    scanError.value = t('discs.add.invalidQr')
    return
  }

  lastScannedText = text
  scanError.value = ''
  pair(parsed.id, parsed.password)
}
</script>

<template>
  <AppLayout :tabs="false">
    <SdAppBar back :title="t('discs.add.title')" />

    <div class="add-mode">
      <button
        type="button"
        :class="['add-mode__btn', { 'add-mode__btn--on': mode === 'scan' }]"
        @click="mode = 'scan'"
      >
        <ScanLine :size="16" :stroke-width="2" />
        {{ t('discs.add.scanTab') }}
      </button>
      <button
        type="button"
        :class="['add-mode__btn', { 'add-mode__btn--on': mode === 'manual' }]"
        @click="mode = 'manual'"
      >
        <Keyboard :size="16" :stroke-width="2" />
        {{ t('discs.add.manualTab') }}
      </button>
    </div>

    <div v-if="mode === 'scan'" class="add-scan">
      <QrScanner @decode="handleDecode" />
      <div class="add-hint">
        <span class="add-hint__badge">
          <Info :size="15" :stroke-width="1.75" />
        </span>
        <p class="add-hint__text">{{ t('discs.add.scanHint') }}</p>
      </div>
      <p v-if="scanError" class="add-error add-error--center">{{ scanError }}</p>
      <p v-if="pairError" class="add-error add-error--center">{{ pairError }}</p>
    </div>

    <div v-else class="add-form">
      <SdField
        v-model="uuid"
        :label="t('discs.add.uuidLabel')"
        :placeholder="t('discs.add.uuidPlaceholder')"
        :sanitize="sanitizeUUID"
        :maxlength="40"
      >
        <template #icon><Hash :size="18" :stroke-width="1.75" /></template>
      </SdField>
      <SdField
        v-model="password"
        :label="t('discs.add.passwordLabel')"
        :placeholder="t('discs.add.passwordPlaceholder')"
        type="password"
        :sanitize="sanitizePassword"
        :maxlength="128"
      >
        <template #icon><Lock :size="18" :stroke-width="1.75" /></template>
      </SdField>
      <p v-if="pairError" class="add-error">{{ pairError }}</p>
      <SdBtn variant="primary" size="lg" block :disabled="!uuid || !password || pairing" @click="handlePairDisc">
        <template #icon-left><Check :size="18" :stroke-width="2" /></template>
        {{ pairing ? t('discs.add.pairing') : t('discs.add.pairDisc') }}
      </SdBtn>
    </div>
  </AppLayout>
</template>

<style scoped>
.add-mark {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: var(--sd-gold-grad);
  box-shadow: 0 10px 24px rgba(184, 146, 79, .35);
  margin: 8px auto 20px;
}
.add-mark img {
  width: 48px;
  opacity: .9;
}

.add-hint {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 40px 0 0 0;
  padding: 12px 14px;
  border-radius: var(--sd-r-md);
  background: var(--sd-glass-light-bg);
  border: 1px solid var(--sd-glass-light-border);
}

.add-hint__badge {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-top: 1px;
  margin-right: 5px;
  border-radius: 50%;
  background: rgba(111, 147, 181, .14);
  color: var(--sd-azure);
}

.add-hint__text {
  flex: 1;
  font-family: var(--sd-font-body);
  font-size: 14px;
  color: var(--sd-fg2);
  text-align: left;
  margin: 0;
  line-height: 1.4;
}

.add-mode {
  display: flex;
  gap: 4px;
  padding: 4px;
  margin: 0 0 20px;
  border-radius: var(--sd-r-pill);
  background: var(--sd-glass-light-bg);
  border: 1px solid var(--sd-glass-light-border);
}

.add-mode__btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  outline: none;
  background: transparent;
  border-radius: var(--sd-r-pill);
  padding: 10px 12px;
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 13px;
  color: var(--sd-fg2);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.add-mode__btn--on {
  background: var(--sd-ink);
  color: #fff;
}

.add-scan {
  display: flex;
  flex-direction: column;
}

.add-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

@media (min-width: 768px) {
  .add-form,
  .add-hint {
    width: 100%;
    max-width: 440px;
    margin-inline: auto;
  }
}

.add-error {
  font-family: var(--sd-font-body);
  font-size: 13px;
  color: var(--sd-danger);
  margin: -6px 0 0;
  line-height: 1.4;
}

.add-error--center {
  text-align: center;
  margin: 14px 0 0;
}
</style>
