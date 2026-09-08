<script setup>
import {ref, computed} from 'vue'
import {useRouter} from 'vue-router'
import {SdBtn, SdBottomSheet} from '@/components/ui'
import {useAuth} from '@/composables/useAuth'
import {useI18n} from '@/i18n'

const props = defineProps({
  modelValue: {type: Boolean, default: false},
})
const emit = defineEmits(['update:modelValue'])

const router = useRouter()
const {signOut} = useAuth()
const {t} = useI18n()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const signOutLoading = ref(false)

async function handleSignOut() {
  if (signOutLoading.value) return
  signOutLoading.value = true
  try {
    await signOut()
    router.push('/welcome')
  } finally {
    signOutLoading.value = false
  }
}
</script>

<template>
  <SdBottomSheet v-model="open" :title="t('settings.accountSecurity.signOutSheetTitle')">
    <div class="pw-stack">
      <div class="pw-actions">
        <SdBtn variant="ghost" size="md" style="flex:1;" @click="open = false">{{ t('common.cancel') }}</SdBtn>
        <SdBtn
            variant="primary"
            size="md"
            style="flex:1;"
            class="danger-confirm-btn"
            :disabled="signOutLoading"
            @click="handleSignOut"
        >
          {{ signOutLoading ? t('settings.accountSecurity.signingOut') : t('settings.accountSecurity.signOutConfirm') }}
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
