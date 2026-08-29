<script setup>
import { useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { SdBtn } from '@/components/ui'
import { useI18n } from '@/i18n'

const router = useRouter()
const { t } = useI18n()
</script>

<template>
  <AuthLayout dark>
    <div class="welcome-body">
      <div class="splash-mark">
        <img
          src="/images/SmartDisc_Mark.png"
          alt="SmartDisc"
          class="splash-mark__img"
        />
      </div>

      <div class="welcome-copy">
        <p class="welcome-eyebrow">{{ t('welcome.eyebrow') }}</p>
        <h1 class="welcome-h1" style="white-space: pre-line;">{{ t('welcome.title') }}</h1>
        <p class="welcome-sub">
          {{ t('welcome.subtitle') }}
        </p>
      </div>
    </div>

    <div class="welcome-actions">
      <SdBtn variant="gold" size="lg" block @click="router.push('/sign-up')">
        {{ t('welcome.createAccount') }}
      </SdBtn>
      <SdBtn variant="dark-glass" size="lg" block @click="router.push('/sign-in')">
        {{ t('welcome.signIn') }}
      </SdBtn>
    </div>
  </AuthLayout>
</template>

<style scoped>
.welcome-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  padding: 40px 0 20px;
}

.splash-mark {
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.splash-mark__img {
  width: 200px;
  position: relative;
  z-index: 2;
}

.welcome-copy { text-align: center; }

.welcome-eyebrow {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--sd-gold-300);
  margin: 0;
}
.welcome-h1 {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 36px;
  letter-spacing: -0.02em;
  line-height: 1.05;
  color: #fff;
  margin: 8px 0 0;
}
.welcome-sub {
  font-family: var(--sd-font-body);
  font-size: 15px;
  line-height: 1.45;
  color: var(--sd-fg2-on-dark);
  margin: 12px 24px 0;
}

.welcome-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 40px;
  flex: none;
}
</style>
