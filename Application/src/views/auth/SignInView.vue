<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Mail, Lock, ArrowRight } from 'lucide-vue-next'
import AuthLayout from '@/layouts/AuthLayout.vue'
import AuthBackBtn from '@/components/auth/AuthBackBtn.vue'
import { SdBtn, SdField } from '@/components/ui'
import { useAuth } from '@/composables/useAuth'
import { email as validateEmail, required } from '@/utils/validate'
import { sanitizeEmail, sanitizePassword } from '@/utils/sanitize'
import { useI18n } from '@/i18n'

const router = useRouter()
const { signIn, isLoading, error: authError, clearError } = useAuth()
const { t } = useI18n()

const form     = reactive({ email: '', password: '' })
const errors   = reactive({ email: '', password: '' })

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
      </SdField>

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
