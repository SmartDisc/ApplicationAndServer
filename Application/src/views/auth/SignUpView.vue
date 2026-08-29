<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { User, Mail, Lock, Info } from 'lucide-vue-next'
import AuthLayout from '@/layouts/AuthLayout.vue'
import AuthBackBtn from '@/components/auth/AuthBackBtn.vue'
import { SdBtn, SdField } from '@/components/ui'
import SdPasswordHint from '@/components/auth/SdPasswordHint.vue'
import { useAuth } from '@/composables/useAuth'
import { useClickOutside } from '@/composables/useClickOutside'
import { email as validateEmail, password as validatePassword, required } from '@/utils/validate'
import { sanitizeName, sanitizeEmail, sanitizePassword } from '@/utils/sanitize'
import { useI18n } from '@/i18n'

const router = useRouter()
const { signUp, isLoading, error: authError, clearError } = useAuth()
const { t } = useI18n()

const form   = reactive({ name: '', email: '', password: '', confirm: '' })
const errors = reactive({ name: '', email: '', password: '', confirm: '' })
const showHint = ref(false)
const passwordWrapRef = ref(null)
useClickOutside(passwordWrapRef, () => { showHint.value = false })

function validate() {
  errors.name     = form.name.trim().length >= 2 ? '' : t('validate.nameTooShort')
  errors.email    = validateEmail(form.email, t)
  errors.password = validatePassword(form.password, t)
  errors.confirm  = form.confirm !== form.password
    ? t('validate.passwordsNoMatch')
    : required(form.confirm, t('validate.confirmPasswordLabel'), t)
  return !errors.name && !errors.email && !errors.password && !errors.confirm
}

async function handleSubmit() {
  clearError()
  if (!validate()) return
  try {
    await signUp(form.name, form.email, form.password)
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
      <p class="auth-eyebrow">{{ t('auth.signUp.eyebrow') }}</p>
      <h1 class="auth-h1">{{ t('auth.signUp.title') }}</h1>
      <p class="auth-sub">
        {{ t('auth.signUp.subtitle') }}
      </p>
    </header>

    <form class="auth-form" novalidate @submit.prevent="handleSubmit">
      <SdField
        v-model="form.name"
        :label="t('auth.fullName')"
        :placeholder="t('auth.fullNamePlaceholder')"
        autocomplete="name"
        :error="errors.name"
        :disabled="isLoading"
        :sanitize="sanitizeName"
        :maxlength="50"
        @input="errors.name = ''"
      >
        <template #icon><User :size="18" :stroke-width="1.75" /></template>
      </SdField>

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

      <!-- Password with info toggle -->
      <div class="password-wrap" ref="passwordWrapRef">
        <SdField
          v-model="form.password"
          :label="t('auth.password')"
          :placeholder="t('auth.passwordPlaceholder')"
          type="password"
          autocomplete="new-password"
          :error="errors.password"
          :disabled="isLoading"
          :sanitize="sanitizePassword"
          :maxlength="128"
          @input="errors.password = ''; errors.confirm = ''"
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

      <!-- Confirm password -->
      <SdField
        v-model="form.confirm"
        :label="t('auth.repeatPassword')"
        :placeholder="t('auth.repeatPasswordPlaceholder')"
        type="password"
        autocomplete="new-password"
        :error="errors.confirm"
        :disabled="isLoading"
        :sanitize="sanitizePassword"
        :maxlength="128"
        @input="errors.confirm = ''"
      >
        <template #icon><Lock :size="18" :stroke-width="1.75" /></template>
      </SdField>

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
        {{ isLoading ? t('auth.signUp.submitting') : t('auth.signUp.submit') }}
      </SdBtn>

      <p class="sign-up__legal">
        {{ t('auth.signUp.legalPrefix') }}
        <a href="#" class="sign-up__legal-link">{{ t('auth.signUp.terms') }}</a> {{ t('auth.signUp.legalAnd') }}
        <a href="#" class="sign-up__legal-link">{{ t('auth.signUp.privacyPolicy') }}</a>.
      </p>
    </form>

    <div class="auth-spacer" />

    <footer class="auth-footer">
      {{ t('auth.signUp.alreadyHaveOne') }}
      <RouterLink to="/sign-in" class="auth-footer__link">{{ t('auth.signUp.signInLink') }}</RouterLink>
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
.info-btn:hover       { color: var(--sd-azure); background: rgba(111,147,181,.10); }
.info-btn--active     { color: var(--sd-azure); background: rgba(111,147,181,.14); }

.sign-up__legal {
  font-family: var(--sd-font-body);
  font-size: 12px;
  color: var(--sd-fg3);
  text-align: center;
  line-height: 1.45;
  margin: 0 14px;
}
.sign-up__legal-link {
  color: var(--sd-azure);
  text-decoration: none;
}
.sign-up__legal-link:hover { text-decoration: underline; }
</style>
