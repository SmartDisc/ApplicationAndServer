<script setup>
import {ref, computed} from 'vue'
import {
  KeyRound, ChevronRight, AlertTriangle, LogOut,
  Ruler, Gauge, Languages,
  FileText, Lock, Info, ExternalLink,
} from 'lucide-vue-next'
import AppLayout from '@/layouts/AppLayout.vue'
import SdAppBar from '@/components/ui/SdAppBar.vue'
import SdAvatar from '@/components/ui/SdAvatar.vue'
import {
  SdList,
  SdListRow,
  SdSectionLabel,
  SdCard,
  SdPageHeader,
  SdBtn,
  SdOptionSheet
} from '@/components/ui'
import ChangePasswordSheet from '@/components/settings/ChangePasswordSheet.vue'
import DeleteAccountSheet from '@/components/settings/DeleteAccountSheet.vue'
import SignOutSheet from '@/components/settings/SignOutSheet.vue'
import {useAuth} from '@/composables/useAuth'
import {usePreferences} from '@/composables/usePreferences'
import {useI18n} from '@/i18n'

const {user} = useAuth()
const {
  language, distanceUnit, speedUnit,
  saveLanguage, saveDistanceUnit, saveSpeedUnit,
} = usePreferences()
const {t} = useI18n()

// Account-action confirmation sheets. Each sheet is a self-contained child that
// owns its own form/loading/error state; the parent only tracks open/closed.
const passwordSheet = ref(false)
const deleteSheet = ref(false)
const signOutSheet = ref(false)

// ── Appearance: unit + language sheets ─────────────────────────────────────
const distanceSheet = ref(false)
const speedSheet = ref(false)
const languageSheet = ref(false)

const distanceOptions = computed(() => [
  {value: 'm', label: t('settings.appearance.distanceKmM'), badge: 'km · m'},
  {value: 'ft', label: t('settings.appearance.distanceMiFt'), badge: 'mi · ft'},
])
const distanceLabel = computed(() =>
    distanceOptions.value.find(o => o.value === distanceUnit.value)?.badge ?? 'm'
)

const speedOptions = computed(() => [
  {value: 'km/h', label: t('settings.appearance.speedKmh'), badge: 'km/h'},
  {value: 'mph', label: t('settings.appearance.speedMph'), badge: 'mph'},
])
const speedLabel = computed(() =>
    speedOptions.value.find(o => o.value === speedUnit.value)?.badge ?? 'km/h'
)

const languageOptions = computed(() => [
  {value: 'en', label: t('settings.appearance.languageEnglish'), badge: 'EN'},
  {value: 'de', label: t('settings.appearance.languageGerman'), badge: 'DE'},
])
const languageLabel = computed(() =>
    languageOptions.value.find(o => o.value === language.value)?.badge ?? 'EN'
)

// ── Help & support ──────────────────────────────────────────────────────────
function openWebsite() {
  window.open('https://smartdisc.at', '_blank', 'noopener')
}
</script>

<template>
  <AppLayout>
    <SdAppBar title=""/>

    <SdPageHeader class="settings-head" :eyebrow="t('settings.page.eyebrow')" :title="t('settings.page.title')"/>

    <!-- Profile card -->
    <SdCard class="profile-card">
      <SdAvatar :name="user?.name ?? 'User'" :size="52" :hue="210"/>
      <div class="profile-info">
        <div class="profile-name">{{ user?.name ?? 'Alex Rivera' }}</div>
        <div class="profile-email">{{ user?.email ?? 'alex@smartdisc.io' }}</div>
      </div>
    </SdCard>

    <div class="settings-groups">
      <!-- Appearance -->
      <div>
        <SdSectionLabel>{{ t('settings.page.appearance') }}</SdSectionLabel>
        <SdList>
          <SdListRow
              tappable
              :title="t('settings.appearance.distanceTitle')"
              :subtitle="distanceUnit === 'm' ? t('settings.appearance.distanceSubtitleMetric') : t('settings.appearance.distanceSubtitleImperial')"
              @click="distanceSheet = true"
          >
            <template #icon>
              <Ruler :size="18" style="color: var(--sd-ink);" :stroke-width="1.75"/>
            </template>
            <template #trailing>
              <span class="pref-value">{{ distanceLabel }}</span>
              <ChevronRight :size="16" style="color: var(--sd-fg3);"/>
            </template>
          </SdListRow>
          <SdListRow tappable :title="t('settings.appearance.speedTitle')"
                     :subtitle="t('settings.appearance.speedSubtitle')" @click="speedSheet = true">
            <template #icon>
              <Gauge :size="18" style="color: var(--sd-ink);" :stroke-width="1.75"/>
            </template>
            <template #trailing>
              <span class="pref-value">{{ speedLabel }}</span>
              <ChevronRight :size="16" style="color: var(--sd-fg3);"/>
            </template>
          </SdListRow>
          <SdListRow
              tappable
              :title="t('settings.appearance.languageTitle')"
              :subtitle="languageOptions.find(o => o.value === language)?.label ?? 'English'"
              @click="languageSheet = true"
          >
            <template #icon>
              <Languages :size="18" style="color: var(--sd-ink);" :stroke-width="1.75"/>
            </template>
            <template #trailing>
              <span class="pref-value">{{ languageLabel }}</span>
              <ChevronRight :size="16" style="color: var(--sd-fg3);"/>
            </template>
          </SdListRow>
        </SdList>
      </div>

      <!-- Help & support -->
      <div>
        <SdSectionLabel>{{ t('settings.page.helpSupport') }}</SdSectionLabel>
        <SdCard class="support-card" :padding="18">
          <div class="support-header">

            <div>
              <div class="support-title">{{ t('settings.helpSupport.liveSupport') }}</div>
              <div class="support-meta">{{ t('settings.helpSupport.liveSupportMeta') }}</div>
            </div>
          </div>
          <SdBtn variant="primary" size="md" block @click="openWebsite">
            <template #icon-left>
              <ExternalLink :size="16"/>
            </template>
            {{ t('settings.helpSupport.chatWithUs') }}
          </SdBtn>
        </SdCard>
      </div>

      <div>
        <SdSectionLabel>{{ t('settings.page.info') }}</SdSectionLabel>
        <SdList class="help-list">
          <SdListRow tappable :title="t('settings.helpSupport.terms')" @click="openWebsite">
            <template #icon>
              <FileText :size="18" style="color: var(--sd-ink); flex: none;"/>
            </template>
            <template #trailing>
              <ExternalLink :size="16" style="color: var(--sd-fg3);"/>
            </template>
          </SdListRow>
          <SdListRow tappable :title="t('settings.helpSupport.privacy')" @click="openWebsite">
            <template #icon>
              <Lock :size="18" style="color: var(--sd-ink); flex: none;"/>
            </template>
            <template #trailing>
              <ExternalLink :size="16" style="color: var(--sd-fg3);"/>
            </template>
          </SdListRow>
          <SdListRow :title="t('settings.helpSupport.appVersion')"
                     :subtitle="t('settings.helpSupport.appVersionValue')">
            <template #icon>
              <Info :size="18" style="color: var(--sd-ink); flex: none;"/>
            </template>
          </SdListRow>
        </SdList>
      </div>

      <!-- Account -->
      <div>
        <SdSectionLabel>{{ t('settings.page.account') }}</SdSectionLabel>
        <SdBtn variant="ghost" size="md" block class="change-password-btn" @click="passwordSheet = true">
          <template #icon-left>
            <KeyRound :size="16"/>
          </template>
          {{ t('settings.accountSecurity.changePassword') }}
        </SdBtn>
        <SdBtn variant="ghost" size="md" block class="danger-btn" @click="signOutSheet = true">
          <template #icon-left>
            <LogOut :size="16"/>
          </template>
          {{ t('settings.page.signOut') }}
        </SdBtn>
        <SdBtn variant="ghost" size="md" block class="danger-btn" @click="deleteSheet = true">
          <template #icon-left>
            <AlertTriangle :size="16"/>
          </template>
          {{ t('settings.accountSecurity.deleteAccount') }}
        </SdBtn>
      </div>
    </div>

    <div :style="{ height: 'var(--sd-nav-clearance)' }"/>

    <ChangePasswordSheet v-model="passwordSheet"/>
    <DeleteAccountSheet v-model="deleteSheet"/>
    <SignOutSheet v-model="signOutSheet"/>

    <SdOptionSheet
        v-model="distanceSheet"
        :title="t('settings.appearance.distanceSheetTitle')"
        :options="distanceOptions"
        :selected="distanceUnit"
        @select="saveDistanceUnit"
    />
    <SdOptionSheet
        v-model="speedSheet"
        :title="t('settings.appearance.speedSheetTitle')"
        :options="speedOptions"
        :selected="speedUnit"
        @select="saveSpeedUnit"
    />
    <SdOptionSheet
        v-model="languageSheet"
        :title="t('settings.appearance.languageSheetTitle')"
        :options="languageOptions"
        :selected="language"
        @select="saveLanguage"
    />
  </AppLayout>
</template>

<style scoped>
.settings-head {
  margin-bottom: 14px;
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.profile-name {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 17px;
  color: var(--sd-fg1);
}

.profile-email {
  font-family: var(--sd-font-display);
  font-size: 11px;
  color: var(--sd-fg3);
  letter-spacing: 0.02em;
  margin-top: 3px;
}

.settings-groups {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.pref-value {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 13px;
  color: var(--sd-ink);
}

/* Help & support */
.support-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 8px;
}

.support-header {
  display: flex;
  gap: 12px;
  align-items: center;
}

.support-title {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 15px;
  color: var(--sd-fg1);
}

.support-meta {
  font-family: var(--sd-font-display);
  font-size: 11px;
  color: var(--sd-fg3);
  letter-spacing: 0.02em;
  margin-top: 2px;
}

.list-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: linear-gradient(140deg, #1d3d72, #0a1c3d);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.list-icon--gold {
  width: 38px;
  height: 38px;
  background: var(--sd-gold-grad);
  color: #5a4416;
}

.help-list {
  box-shadow: none;
}

.change-password-btn {
  margin-top: 10px;
}

/* Danger actions */
.danger-btn {
  margin-top: 10px;
  color: var(--sd-danger) !important;
  border-color: rgba(192, 88, 78, .30) !important;
}

.danger-btn:hover {
  background: rgba(192, 88, 78, .04) !important;
}

/* ≥768px: full-width account action buttons look unwieldy in the wide
   column — cap them at a comfortable tap width. */
@media (min-width: 768px) {
  .change-password-btn,
  .danger-btn {
    max-width: 440px;
  }
}
</style>
