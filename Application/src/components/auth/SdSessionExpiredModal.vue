<script setup>
// Blocking, non-dismissable popup shown when a signed-in session dies mid-use
// (see api.js's onUnauthorized + the auth store's sessionExpired flag). There
// is deliberately no backdrop-click or swipe dismissal — the only way out is
// the sign-in link, which is the point.
import { useRouter } from 'vue-router'
import { LogOut } from 'lucide-vue-next'
import { SdBtn } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/i18n'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

function goToSignIn() {
  authStore.clearSessionExpired()
  router.push('/sign-in')
}
</script>

<template>
  <Teleport to="body">
    <div class="session-expired-backdrop">
      <div class="session-expired-panel" role="alertdialog" aria-modal="true" :aria-label="t('sessionExpired.title')">
        <p class="session-expired-title">{{ t('sessionExpired.title') }}</p>
        <p class="session-expired-body">{{ t('sessionExpired.body') }}</p>
        <SdBtn variant="primary" size="md" block @click="goToSignIn">
          {{ t('sessionExpired.cta') }}
        </SdBtn>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.session-expired-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 28, 61, .45);
  -webkit-backdrop-filter: blur(4px);
          backdrop-filter: blur(4px);
  z-index: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.session-expired-panel {
  width: 100%;
  max-width: 340px;
  background: var(--sd-glass-paper-bg);
  -webkit-backdrop-filter: var(--sd-glass-blur-strong);
          backdrop-filter: var(--sd-glass-blur-strong);
  border: 1px solid var(--sd-glass-paper-border);
  border-radius: var(--sd-r-xl);
  box-shadow: var(--sd-shadow-lg);
  padding: 28px 24px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
}

.session-expired-icon {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: rgba(16, 42, 87, .08);
  color: var(--sd-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
}

.session-expired-title {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 17px;
  color: var(--sd-fg1);
  margin: 0;
}

.session-expired-body {
  font-family: var(--sd-font-body);
  font-size: 14px;
  color: var(--sd-fg3);
  line-height: 1.5;
  margin: 0 0 14px;
}
</style>
