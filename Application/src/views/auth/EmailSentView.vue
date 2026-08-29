<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { MailCheck, Clock, ExternalLink } from 'lucide-vue-next'
import AuthLayout from '@/layouts/AuthLayout.vue'
import AuthBackBtn from '@/components/auth/AuthBackBtn.vue'
import { SdBtn } from '@/components/ui'
import { useAuth } from '@/composables/useAuth'
import { useI18n } from '@/i18n'

const router = useRouter()
const { sendPasswordReset, isLoading } = useAuth()
const { t } = useI18n()

const sentTo = ref(history.state?.email || '')

const RESEND_COOLDOWN = 42
const resendCountdown = ref(RESEND_COOLDOWN)
const canResend = ref(false)
let timer = null

function startCountdown() {
  resendCountdown.value = RESEND_COOLDOWN
  canResend.value = false
  clearInterval(timer)
  timer = setInterval(() => {
    resendCountdown.value -= 1
    if (resendCountdown.value <= 0) {
      canResend.value = true
      clearInterval(timer)
    }
  }, 1000)
}

onMounted(startCountdown)
onUnmounted(() => clearInterval(timer))

async function handleResend() {
  if (!canResend.value || !sentTo.value) return
  await sendPasswordReset(sentTo.value)
  startCountdown()
}

function openMailApp() {
  window.location.href = 'mailto:'
}

const formattedCountdown = () => {
  const m = Math.floor(resendCountdown.value / 60)
  const s = resendCountdown.value % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
</script>

<template>
  <AuthLayout>
    <nav class="auth-nav">
      <AuthBackBtn to="/forgot-password" />
    </nav>

    <!-- Centered success state -->
    <div class="email-sent-body">
      <div class="email-sent-icon">
        <MailCheck :size="42" :stroke-width="1.5" />
      </div>

      <p class="auth-eyebrow">{{ t('auth.emailSent.eyebrow') }}</p>
      <h1 class="auth-h1">{{ t('auth.emailSent.title') }}</h1>
      <p class="auth-sub">
        {{ t('auth.emailSent.subtitlePrefix') }}
        <strong class="email-sent-address">{{ sentTo || t('auth.emailSent.defaultEmail') }}</strong>.
        {{ t('auth.emailSent.subtitleSuffix') }}
      </p>

      <div class="email-sent-expiry">
        <Clock :size="14" :stroke-width="1.75" />
        <span>{{ t('auth.emailSent.expiresIn') }}</span>
      </div>
    </div>

    <div class="auth-spacer" />

    <!-- Actions -->
    <div class="email-sent-actions">
      <SdBtn variant="primary" size="lg" block @click="openMailApp">
        <template #icon-left>
          <ExternalLink :size="17" :stroke-width="1.75" />
        </template>
        {{ t('auth.emailSent.openMailApp') }}
      </SdBtn>

      <p class="email-sent-resend">
        {{ t('auth.emailSent.didntGetIt') }}
        <button
          class="email-sent-resend__btn"
          :disabled="!canResend || isLoading"
          @click="handleResend"
        >
          {{
            canResend
              ? t('auth.emailSent.resend')
              : t('auth.emailSent.resendIn', { time: formattedCountdown() })
          }}
        </button>
      </p>
    </div>
  </AuthLayout>
</template>

<style scoped>
.email-sent-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  justify-content: center;
  gap: 0;
  padding: 20px 6px 0;
}

.email-sent-icon {
  width: 100px;
  height: 100px;
  border-radius: 30px;
  background: var(--sd-glass-light-bg);
  border: 1px solid var(--sd-glass-light-border);
  -webkit-backdrop-filter: var(--sd-glass-blur);
          backdrop-filter: var(--sd-glass-blur);
  box-shadow: var(--sd-shadow-glass);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sd-gold-500);
  margin-bottom: 22px;
  flex: none;
}

.auth-eyebrow { margin: 0; }
.auth-h1 { margin: 6px 0 0; }
.auth-sub { margin: 10px 0 0; max-width: 300px; }

.email-sent-address { color: var(--sd-ink); font-style: normal; }

.email-sent-expiry {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  font-family: var(--sd-font-display);
  font-size: 13px;
  color: var(--sd-fg2);
}

.email-sent-actions {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 40px;
  flex: none;
}

.email-sent-resend {
  font-family: var(--sd-font-body);
  font-size: 13px;
  color: var(--sd-fg2);
  text-align: center;
  margin: 0;
}
.email-sent-resend__btn {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 13px;
  color: var(--sd-ink);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.email-sent-resend__btn:disabled {
  color: var(--sd-fg3);
  cursor: default;
}
</style>
