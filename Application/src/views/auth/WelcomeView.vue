<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Languages, ChevronDown, Check } from 'lucide-vue-next'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { SdBtn } from '@/components/ui'
import { useI18n } from '@/i18n'
import { usePreferences } from '@/composables/usePreferences'
import { useClickOutside } from '@/composables/useClickOutside'

const router = useRouter()
const { t } = useI18n()
const { language, saveLanguage } = usePreferences()

const LANGUAGES = [
  { value: 'en', label: 'English', badge: 'EN' },
  { value: 'de', label: 'Deutsch', badge: 'DE' },
]

const langMenuOpen = ref(false)
const langWrapRef = ref(null)
useClickOutside(langWrapRef, () => { langMenuOpen.value = false })

function pickLanguage(value) {
  saveLanguage(value)
  langMenuOpen.value = false
}
</script>

<template>
  <AuthLayout dark>
    <div class="welcome-lang" ref="langWrapRef">
      <button
        type="button"
        class="welcome-lang__trigger"
        :aria-expanded="langMenuOpen"
        @click="langMenuOpen = !langMenuOpen"
      >
        <Languages :size="16" :stroke-width="1.75" />
        <span>{{ LANGUAGES.find(l => l.value === language)?.badge ?? 'EN' }}</span>
        <ChevronDown :size="14" :stroke-width="2" :class="{ 'welcome-lang__chevron--up': langMenuOpen }" />
      </button>

      <div v-if="langMenuOpen" class="welcome-lang__menu">
        <button
          v-for="opt in LANGUAGES"
          :key="opt.value"
          type="button"
          class="welcome-lang__item"
          @click="pickLanguage(opt.value)"
        >
          {{ opt.label }}
          <Check v-if="opt.value === language" :size="15" :stroke-width="2" />
        </button>
      </div>
    </div>

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
.welcome-lang {
  position: relative;
  display: flex;
  justify-content: flex-end;
  padding: 12px 0 0;
  flex: none;
}

.welcome-lang__trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.02em;
  color: #fff;
  background: rgba(255, 255, 255, .12);
  border: 1px solid rgba(255, 255, 255, .18);
  border-radius: var(--sd-r-pill);
  padding: 0 14px;
  cursor: pointer;
  transition: background var(--sd-dur-fast) var(--sd-ease-out),
              transform var(--sd-dur-fast) var(--sd-ease-out);
}
.welcome-lang__trigger:hover  { background: rgba(255, 255, 255, .18); }
.welcome-lang__trigger:active { transform: scale(0.96); }

.welcome-lang__trigger :deep(svg:last-child) {
  transition: transform var(--sd-dur-fast) var(--sd-ease-out);
}
.welcome-lang__chevron--up {
  transform: rotate(180deg);
}

.welcome-lang__menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 140px;
  display: flex;
  flex-direction: column;
  padding: 6px;
  border-radius: var(--sd-r-sm);
  background: var(--sd-glass-dark-bg);
  border: 1px solid var(--sd-glass-dark-border);
  -webkit-backdrop-filter: var(--sd-glass-blur-strong);
          backdrop-filter: var(--sd-glass-blur-strong);
  box-shadow: var(--sd-shadow-glass-dark);
  z-index: 10;
}

.welcome-lang__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-family: var(--sd-font-body);
  font-size: 14px;
  color: var(--sd-fg-on-dark);
  background: none;
  border: none;
  border-radius: var(--sd-r-xs);
  padding: 9px 10px;
  cursor: pointer;
  text-align: left;
}
.welcome-lang__item:hover { background: rgba(255, 255, 255, .10); }
.welcome-lang__item svg { color: var(--sd-gold-300); flex: none; }

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
