<script setup>
import {ref, computed, watch} from 'vue'
import {KeyRound} from 'lucide-vue-next'
import {SdBtn, SdField, SdBottomSheet} from '@/components/ui'
import SdPasswordHint from '@/components/auth/SdPasswordHint.vue'
import {useAuth} from '@/composables/useAuth'
import {mapAuthError} from '@/stores/auth'
import {sanitizePassword} from '@/utils/sanitize'
import {password as validatePassword} from '@/utils/validate'
import {useI18n} from '@/i18n'

const props = defineProps({
  modelValue: {type: Boolean, default: false},
})
const emit = defineEmits(['update:modelValue'])

const {changePassword} = useAuth()
const {t} = useI18n()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const currentPw = ref('')
const newPw = ref('')
const confirmPw = ref('')
const pwLoading = ref(false)
const pwError = ref('')
const pwSuccess = ref(false)

const pwSaveDisabled = computed(() =>
    !currentPw.value ||
    !!validatePassword(newPw.value) ||
    newPw.value !== confirmPw.value
)

// Reset the form each time the sheet opens (mirrors the old openPasswordSheet()).
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    currentPw.value = ''
    newPw.value = ''
    confirmPw.value = ''
    pwError.value = ''
    pwSuccess.value = false
  }
})

async function handlePasswordChange() {
  if (pwSaveDisabled.value) return
  if (newPw.value !== confirmPw.value) {
    pwError.value = t('settings.accountSecurity.passwordsNoMatch')
    return
  }
  pwLoading.value = true
  pwError.value = ''
  try {
    await changePassword(currentPw.value, newPw.value)
    pwSuccess.value = true
    setTimeout(() => {
      open.value = false
      pwSuccess.value = false
    }, 1200)
  } catch (err) {
    pwError.value = mapAuthError(err, t)
  } finally {
    pwLoading.value = false
  }
}
</script>

<template>
  <SdBottomSheet v-model="open" :title="t('settings.accountSecurity.passwordSheetTitle')">
    <div class="pw-stack">
      <div class="pw-header">
        <div class="pw-header__icon">
          <KeyRound :size="18" :stroke-width="1.75"/>
        </div>
        <div>
          <p class="pw-header__eyebrow">{{ t('settings.accountSecurity.passwordSheetEyebrow') }}</p>
          <p class="pw-header__sub">{{ t('settings.accountSecurity.passwordSheetSubtitle') }}</p>
        </div>
      </div>
      <SdField
          v-model="currentPw"
          :label="t('settings.accountSecurity.currentPassword')"
          type="password"
          :sanitize="sanitizePassword"
          :maxlength="128"
      />
      <SdField
          v-model="newPw"
          :label="t('settings.accountSecurity.newPassword')"
          type="password"
          :sanitize="sanitizePassword"
          :maxlength="128"
      />
      <SdPasswordHint :value="newPw"/>
      <SdField
          v-model="confirmPw"
          :label="t('settings.accountSecurity.repeatNewPassword')"
          type="password"
          :sanitize="sanitizePassword"
          :maxlength="128"
          :error="confirmPw && newPw !== confirmPw ? t('settings.accountSecurity.passwordsNoMatch') : ''"
      />
      <p v-if="pwSuccess" class="pw-success">{{ t('settings.accountSecurity.passwordUpdated') }}</p>
      <p v-if="pwError" class="pw-error">{{ pwError }}</p>
      <div class="pw-actions">
        <SdBtn variant="ghost" size="md" style="flex:1;" :disabled="pwSuccess" @click="open = false">{{
            t('common.cancel')
          }}
        </SdBtn>
        <SdBtn
            variant="primary"
            size="md"
            style="flex:1;"
            :disabled="pwSaveDisabled || pwLoading || pwSuccess"
            @click="handlePasswordChange"
        >
          {{ pwLoading ? t('settings.accountSecurity.saving') : t('settings.accountSecurity.updatePassword') }}
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

.pw-header__eyebrow {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--sd-azure);
  margin: 0 0 2px;
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
</style>
