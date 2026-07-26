<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Hash, Lock, Check } from 'lucide-vue-next'
import AppLayout from '@/layouts/AppLayout.vue'
import SdAppBar from '@/components/ui/SdAppBar.vue'
import { SdBtn, SdField } from '@/components/ui'
import { sanitizeUUID, sanitizePassword } from '@/utils/sanitize'
import { useDiscs } from '@/composables/useDiscs'
import { mapAuthError } from '@/stores/auth'
import { useI18n } from '@/i18n'

const router = useRouter()
const { t } = useI18n()
const { claimDisc } = useDiscs()
const uuid = ref('')
const password = ref('')
const pairing = ref(false)
const pairError = ref('')

async function handlePairDisc() {
  if (!uuid.value || !password.value || pairing.value) return
  pairing.value = true
  pairError.value = ''
  try {
    await claimDisc(uuid.value, password.value)
    router.push('/discs')
  } catch (err) {
    pairError.value = mapAuthError(err, t)
  } finally {
    pairing.value = false
  }
}
</script>

<template>
  <AppLayout :tabs="false">
    <SdAppBar back :title="t('discs.add.title')" />

    <div class="add-form">
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
  font-family: var(--sd-font-body);
  font-size: 14px;
  color: var(--sd-fg2);
  text-align: center;
  margin: 0 0 18px;
  line-height: 1.4;
}

.add-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

@media (min-width: 768px) {
  .add-form {
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
</style>
