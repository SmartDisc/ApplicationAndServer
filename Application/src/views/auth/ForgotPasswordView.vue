<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Mail, Send, ShieldCheck } from 'lucide-vue-next'
import AuthLayout from '@/layouts/AuthLayout.vue'
import AuthBackBtn from '@/components/auth/AuthBackBtn.vue'
import { SdBtn, SdField } from '@/components/ui'
import { useAuth } from '@/composables/useAuth'
import { email as validateEmail } from '@/utils/validate'
import { sanitizeEmail } from '@/utils/sanitize'
import { useI18n } from '@/i18n'

const router = useRouter()
const { sendPasswordReset, isLoading, error: authError, clearError } = useAuth()
const { t } = useI18n()

const form = reactive({ email: '' })
const errors = reactive({ email: '' })

function validate() {
  errors.email = validateEmail(form.email, t)
  return !errors.email
}

async function handleSubmit() {
  clearError()
  if (!validate()) return
  try {
    await sendPasswordReset(form.email)
    // Pass the email via router state — not in the URL, as it's PII
    router.push({ name: 'email-sent', state: { email: form.email } })
  } catch {
    // authError is populated by useAuth
  }
}
</script>

<template>
  <AuthLayout>
    <nav class="auth-nav">
      <AuthBackBtn to="/sign-in" />
    </nav>

    <header class="auth-header">
      <p class="auth-eyebrow">{{ t('auth.forgotPassword.eyebrow') }}</p>
      <h1 class="auth-h1">{{ t('auth.forgotPassword.title') }}</h1>
      <p class="auth-sub">
        {{ t('auth.forgotPassword.subtitle') }}
      </p>
    </header>

    <form class="auth-form" novalidate @submit.prevent="handleSubmit">
      <SdField
        v-model="form.email"
        :label="t('auth.email')"
        :placeholder="t('auth.emailPlaceholder')"
        type="email"
        :error="errors.email"
        :disabled="isLoading"
        :sanitize="sanitizeEmail"
        :maxlength="254"
        @input="errors.email = ''"
      >
        <template #icon><Mail :size="18" :stroke-width="1.75" /></template>
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
        <template #icon-left>
          <Send :size="17" :stroke-width="1.75" />
        </template>
        {{ isLoading ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submit') }}
      </SdBtn>
    </form>

    <div class="auth-spacer" />

    <!-- Glass info card -->
    <div class="info-card">
      <ShieldCheck :size="20" class="info-card__icon" :stroke-width="1.75" />
      <div>
        <p class="info-card__title">{{ t('auth.forgotPassword.infoTitle') }}</p>
        <p class="info-card__body">
          {{ t('auth.forgotPassword.infoBody') }}
        </p>
      </div>
    </div>
  </AuthLayout>
</template>

<style scoped>
.info-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  margin-bottom: 32px;
  background: var(--sd-glass-light-bg);
  border: 1px solid var(--sd-glass-light-border);
  border-radius: var(--sd-r-lg);
  -webkit-backdrop-filter: var(--sd-glass-blur);
          backdrop-filter: var(--sd-glass-blur);
  box-shadow: var(--sd-shadow-glass);
  flex: none;
}
.info-card__icon { color: var(--sd-azure); flex: none; margin-top: 1px; }
.info-card__title {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 13px;
  color: var(--sd-fg1);
  margin: 0 0 3px;
}
.info-card__body {
  font-family: var(--sd-font-body);
  font-size: 12px;
  color: var(--sd-fg2);
  line-height: 1.45;
  margin: 0;
}
</style>
