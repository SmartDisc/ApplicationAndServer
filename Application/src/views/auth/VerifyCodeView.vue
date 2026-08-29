<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ShieldCheck } from 'lucide-vue-next'
import AuthLayout from '@/layouts/AuthLayout.vue'
import AuthBackBtn from '@/components/auth/AuthBackBtn.vue'
import { SdBtn, SdOtpInput } from '@/components/ui'
import { useAuth } from '@/composables/useAuth'
import { useI18n } from '@/i18n'

const router = useRouter()
const { pendingVerification, verify, resendCode, isLoading, error: authError, clearError } = useAuth()
const { t } = useI18n()

// ── OTP state ──────────────────────────────────────────────────────────────
const code = ref('')
const otp  = ref(null)

async function handleVerify() {
  if (code.value.length < 6 || isLoading.value) return
  clearError()
  try {
    const redirectTo = await verify(code.value)
    router.push(redirectTo)
  } catch {
    otp.value?.shake()
    otp.value?.reset()
  }
}

// ── Resend countdown ───────────────────────────────────────────────────────
const COOLDOWN  = 60
const countdown = ref(COOLDOWN)
const canResend = ref(false)
let timer = null

function startCountdown() {
  countdown.value = COOLDOWN
  canResend.value = false
  clearInterval(timer)
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) { canResend.value = true; clearInterval(timer) }
  }, 1000)
}

async function handleResend() {
  if (!canResend.value) return
  await resendCode()
  otp.value?.reset()
  startCountdown()
}

const countdownLabel = computed(() => {
  const m = Math.floor(countdown.value / 60)
  const s = countdown.value % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

onMounted(() => { otp.value?.focus(); startCountdown() })
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <AuthLayout>
    <nav class="auth-nav">
      <AuthBackBtn />
    </nav>

    <!-- Header -->
    <div class="verify-hero">
      <div class="verify-icon">
        <ShieldCheck :size="40" :stroke-width="1.5" />
      </div>
      <p class="auth-eyebrow">{{ t('auth.verify.eyebrow') }}</p>
      <h1 class="auth-h1">{{ t('auth.verify.title') }}</h1>
      <p class="auth-sub">
        {{ t('auth.verify.subtitle') }}<br />
        <strong class="verify-email">{{ pendingVerification?.email }}</strong>
      </p>
    </div>

    <!-- OTP boxes -->
    <SdOtpInput ref="otp" v-model="code" :error="!!authError" class="otp-wrap" @complete="handleVerify" />

    <p v-if="authError" class="verify-error" role="alert">{{ authError }}</p>

    <div class="auth-spacer" />

    <!-- Actions -->
    <div class="verify-footer">
      <SdBtn
        variant="primary"
        size="lg"
        block
        :disabled="code.length < 6 || isLoading"
        @click="handleVerify"
      >
        {{ isLoading ? t('auth.verify.submitting') : t('auth.verify.submit') }}
      </SdBtn>

      <p class="resend-text">
        {{ t('auth.verify.didntGetIt') }}
        <button
          class="resend-btn"
          :disabled="!canResend"
          @click="handleResend"
        >
          {{ canResend ? t('auth.verify.resendCode') : t('auth.verify.resendIn', { time: countdownLabel }) }}
        </button>
      </p>
    </div>
  </AuthLayout>
</template>

<style scoped>
.verify-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 12px 6px 0;
  flex: none;
}

.verify-icon {
  width: 96px;
  height: 96px;
  border-radius: 28px;
  background: var(--sd-glass-light-bg);
  border: 1px solid var(--sd-glass-light-border);
  -webkit-backdrop-filter: var(--sd-glass-blur);
          backdrop-filter: var(--sd-glass-blur);
  box-shadow: var(--sd-shadow-glass);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sd-gold-500);
  margin-bottom: 20px;
  flex: none;
}

.auth-eyebrow { margin: 0; }
.auth-h1      { margin: 6px 0 0; }
.auth-sub     { margin: 10px 0 0; }

.verify-email {
  color: var(--sd-ink);
  font-style: normal;
}

/* OTP row */
.otp-wrap {
  margin-top: 32px;
  flex: none;
}

.verify-error {
  font-family: var(--sd-font-display);
  font-size: 13px;
  color: var(--sd-danger);
  text-align: center;
  margin: 12px 0 0;
}

/* Footer */
.verify-footer {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 40px;
  flex: none;
}

.resend-text {
  font-family: var(--sd-font-body);
  font-size: 13px;
  color: var(--sd-fg2);
  text-align: center;
  margin: 0;
}
.resend-btn {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 13px;
  color: var(--sd-ink);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.resend-btn:disabled {
  color: var(--sd-fg3);
  cursor: default;
}
</style>
