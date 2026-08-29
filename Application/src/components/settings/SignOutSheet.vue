<script setup>
import {ref, computed} from 'vue'
import {useRouter} from 'vue-router'
import {LogOut} from 'lucide-vue-next'
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
      <div class="pw-header">
        <div class="pw-header__icon pw-header__icon--danger">
          <LogOut :size="18" :stroke-width="1.75"/>
        </div>
        <div>
          <p class="pw-header__eyebrow pw-header__eyebrow--danger">
            {{ t('settings.accountSecurity.signOutEyebrow') }}</p>
          <p class="pw-header__sub">{{ t('settings.accountSecurity.signOutBody') }}</p>
        </div>
      </div>
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
