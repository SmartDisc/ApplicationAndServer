<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Mail, Lock, ArrowRight, Info } from 'lucide-vue-next'
import AuthLayout from '@/layouts/AuthLayout.vue'
import AuthBackBtn from '@/components/auth/AuthBackBtn.vue'
import { SdBtn, SdField } from '@/components/ui'
import SdPasswordHint from '@/components/auth/SdPasswordHint.vue'
import { useAuth } from '@/composables/useAuth'
import { useClickOutside } from '@/composables/useClickOutside'
import { email as validateEmail, required } from '@/utils/validate'
import { sanitizeEmail, sanitizePassword } from '@/utils/sanitize'
import { useI18n } from '@/i18n'

const router = useRouter()
const { signIn, isLoading, error: authError, clearError } = useAuth()
const { t } = useI18n()

const form     = reactive({ email: '', password: '' })
const errors   = reactive({ email: '', password: '' })
const showHint = ref(false)
const passwordWrapRef = ref(null)
useClickOutside(passwordWrapRef, () => { showHint.value = false })

function validate() {
  errors.email    = validateEmail(form.email, t)
  errors.password = required(form.password, t('validate.passwordLabel'), t)
  return !errors.email && !errors.password
}

async function handleSubmit() {
  clearError()
  if (!validate()) return
  try {
    await signIn(form.email, form.password)
    router.push('/discs')
  } catch {
    // authError is populated by useAuth
  }
}
</script>

<template>
  <AuthLayout>
    <nav class="auth-nav">
      <AuthBackBtn to="/welcome" />
    </nav>

    <header class="auth-header">
      <p class="auth-eyebrow">{{ t('auth.signIn.eyebrow') }}</p>
      <h1 class="auth-h1">{{ t('auth.signIn.title') }}</h1>
      <p class="auth-sub">{{ t('auth.signIn.subtitle') }}</p>
    </header>

    <form class="auth-form" novalidate @submit.prevent="handleSubmit">
      <SdField
        v-model="form.email"
        :label="t('auth.email')"
        :placeholder="t('auth.emailPlaceholder')"
        type="email"
        autocomplete="username"
        :error="errors.email"
        :disabled="isLoading"
        :sanitize="sanitizeEmail"
        :maxlength="254"
        @input="errors.email = ''"
      >
        <template #icon><Mail :size="18" :stroke-width="1.75" /></template>
      </SdField>

      <div class="password-wrap" ref="passwordWrapRef">
        <SdField
          v-model="form.password"
          :label="t('auth.password')"
          :placeholder="t('auth.currentPasswordPlaceholder')"
          type="password"
          autocomplete="current-password"
          :error="errors.password"
          :disabled="isLoading"
          :sanitize="sanitizePassword"
          :maxlength="128"
          @input="errors.password = ''"
        >
          <template #icon><Lock :size="18" :stroke-width="1.75" /></template>
          <template #action>
            <button
              type="button"
              class="info-btn"
              :class="{ 'info-btn--active': showHint }"
              @click="showHint = !showHint"
              :aria-label="showHint ? t('auth.hidePasswordRules') : t('auth.showPasswordRules')"
            >
              <Info :size="16" :stroke-width="1.75" />
            </button>
          </template>
        </SdField>
        <SdPasswordHint v-if="showHint" :value="form.password" />
      </div>

      <div class="sign-in__forgot">
        <RouterLink to="/forgot-password" class="sign-in__forgot-link">
          {{ t('auth.signIn.forgotPassword') }}
        </RouterLink>
      </div>

      <p v-if="authError" class="auth-form-error" role="alert">
        {{ authError }}
      </p>

      <SdBtn
        type="submit"
        variant="primary"
        size="lg"
        block
        :disabled="isLoading"
      >
        {{ isLoading ? t('auth.signIn.submitting') : t('auth.signIn.submit') }}
        <template v-if="!isLoading" #icon-right>
          <ArrowRight :size="18" :stroke-width="2" />
        </template>
      </SdBtn>
    </form>

    <div class="auth-spacer" />

    <footer class="auth-footer">
      {{ t('auth.signIn.newToApp') }}
      <RouterLink to="/sign-up" class="auth-footer__link">
        {{ t('auth.signIn.createAccountLink') }}
      </RouterLink>
    </footer>
  </AuthLayout>
</template>

<style scoped>
.password-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: none;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--sd-fg3);
  transition: color var(--sd-dur-fast) var(--sd-ease-out),
              background var(--sd-dur-fast) var(--sd-ease-out);
}
.info-btn:hover   { color: var(--sd-azure); background: rgba(111,147,181,.10); }
.info-btn--active { color: var(--sd-azure); background: rgba(111,147,181,.14); }

.sign-in__forgot {
  display: flex;
  justify-content: flex-end;
  margin-top: -4px;
}
.sign-in__forgot-link {
  font-family: var(--sd-font-display);
  font-size: 13px;
  font-weight: 500;
  color: var(--sd-azure);
  text-decoration: none;
}
.sign-in__forgot-link:hover { text-decoration: underline; }
</style>
