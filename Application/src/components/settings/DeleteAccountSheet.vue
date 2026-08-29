<script setup>
import {ref, computed, watch} from 'vue'
import {useRouter} from 'vue-router'
import {AlertTriangle} from 'lucide-vue-next'
import {SdBtn, SdField, SdBottomSheet} from '@/components/ui'
import {useAuth} from '@/composables/useAuth'
import {mapAuthError} from '@/stores/auth'
import {sanitizePassword} from '@/utils/sanitize'
import {useI18n} from '@/i18n'

const props = defineProps({
  modelValue: {type: Boolean, default: false},
})
const emit = defineEmits(['update:modelValue'])

const router = useRouter()
const {deleteAccount} = useAuth()
const {t} = useI18n()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const deletePw = ref('')
const deleteLoading = ref(false)
const deleteError = ref('')
const deleteSuccess = ref(false)

// Reset the form each time the sheet opens (mirrors the old openDeleteSheet()).
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    deletePw.value = ''
    deleteError.value = ''
    deleteSuccess.value = false
  }
})

async function handleDeleteAccount() {
  if (!deletePw.value || deleteLoading.value) return
  deleteLoading.value = true
  deleteError.value = ''
  try {
    await deleteAccount(deletePw.value)
    deleteSuccess.value = true
    setTimeout(() => {
      router.push('/welcome')
    }, 900)
  } catch (err) {
    deleteError.value = mapAuthError(err, t)
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <SdBottomSheet v-model="open" :title="t('settings.accountSecurity.deleteSheetTitle')">
    <div class="pw-stack">
      <div class="pw-header">
        <div class="pw-header__icon pw-header__icon--danger">
          <AlertTriangle :size="18" :stroke-width="1.75"/>
        </div>
        <div>
          <p class="pw-header__eyebrow pw-header__eyebrow--danger">
            {{ t('settings.accountSecurity.deleteWarningEyebrow') }}</p>
          <p class="pw-header__sub">{{ t('settings.accountSecurity.deleteWarningBody') }}</p>
        </div>
      </div>
      <SdField
          v-model="deletePw"
          :label="t('settings.accountSecurity.currentPassword')"
          type="password"
          :sanitize="sanitizePassword"
          :maxlength="128"
      />
      <p v-if="deleteError" class="pw-error">{{ deleteError }}</p>
      <div class="pw-actions">
        <SdBtn variant="ghost" size="md" style="flex:1;" @click="open = false">{{ t('common.cancel') }}</SdBtn>
        <SdBtn
            variant="primary"
            size="md"
            style="flex:1;"
            class="danger-confirm-btn"
            :disabled="!deletePw || deleteLoading"
            @click="handleDeleteAccount"
        >
          {{ deleteLoading ? t('settings.accountSecurity.deleting') : t('settings.accountSecurity.deleteAccount') }}
        </SdBtn>
      </div>
    </div>
  </SdBottomSheet>
</template>

<style scoped>
.pw-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 4px;
}

.pw-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 2px;
}

.pw-header__icon {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sd-gold-grad);
  color: #5a4416;
  box-shadow: var(--sd-shadow-sm);
}

.pw-header__icon--danger {
  background: rgba(192, 88, 78, .12);
  color: var(--sd-danger);
  box-shadow: none;
}

.pw-header__eyebrow {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--sd-azure);
  margin: 0 0 2px;
}

.pw-header__eyebrow--danger {
  color: var(--sd-danger);
}

.pw-header__sub {
  font-family: var(--sd-font-body);
  font-size: 13px;
  color: var(--sd-fg2);
  margin: 0;
  line-height: 1.4;
}

.pw-error {
  font-family: var(--sd-font-body);
  font-size: 13px;
  color: var(--sd-danger);
  margin: 0;
}

.pw-actions {
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
