<script setup>
import {computed, onMounted, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {Disc as DiscIcon, Check, Tag, ArrowRight} from 'lucide-vue-next'
import AppLayout from '@/layouts/AppLayout.vue'
import SdAppBar from '@/components/ui/SdAppBar.vue'
import {SdCard, SdBtn, SdField, SdSectionLabel} from '@/components/ui'
import {useDiscs} from '@/composables/useDiscs'
import {sanitizeText} from '@/utils/sanitize'
import {useI18n} from '@/i18n'

const route = useRoute()
const router = useRouter()
const {getDisc, fetchDiscs, renameDisc} = useDiscs()
const {t} = useI18n()

const disc = computed(() => getDisc(route.params.id))
const name = ref('')
const saving = ref(false)

onMounted(() => {
  if (!disc.value) {
    fetchDiscs().catch(() => {
      // disc just stays null if this fails; template already handles that case
    })
  }
})

// Covers direct navigation to this view (e.g. a page reload) landing here
// before claimDisc()'s synchronous cache update has happened.
watch(disc, d => {
  if (d && !name.value) name.value = d.name
}, {immediate: true})

function leaveWithoutRenaming() {
  router.push('/discs')
}

async function handleOpenDisc() {
  if (saving.value) return
  const trimmed = name.value.trim()
  saving.value = true
  try {
    if (trimmed && trimmed !== disc.value?.name) {
      await renameDisc(route.params.id, trimmed)
    }
    router.push(`/discs/${route.params.id}`)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppLayout :tabs="false">
    <SdAppBar></SdAppBar>

    <SdCard v-if="disc" class="paired-hero" :padding="20">
        <span class="paired-hero__badge">
          <Check :size="14" :stroke-width="2.5"/>
        </span>

      <h1 class="paired-hero__title">{{ t('discs.paired.title', {name: disc.name}) }}</h1>
      <p class="paired-hero__subtitle">{{ t('discs.paired.subtitle') }}</p>
    </SdCard>

    <div class="paired-form">
      <SdSectionLabel>{{ t('discs.paired.nameLabel') }}</SdSectionLabel>
      <SdField
          v-model="name"
          :sanitize="sanitizeText"
          :maxlength="60"
      >
        <template #icon>
          <Tag :size="18" :stroke-width="1.75"/>
        </template>
      </SdField>
    </div>

    <div class="paired-spacer"/>

    <div class="paired-actions">
      <SdBtn variant="ghost" size="lg" @click="leaveWithoutRenaming">
        {{ t('discs.paired.later') }}
      </SdBtn>
      <SdBtn variant="primary" size="lg" class="paired-actions__primary" :disabled="saving" @click="handleOpenDisc">
        {{ t('discs.paired.openDisc') }}
        <template #icon-right>
          <ArrowRight :size="18" :stroke-width="2"/>
        </template>
      </SdBtn>
    </div>
  </AppLayout>
</template>

<style scoped>
.paired-skip {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 14px;
  color: var(--sd-fg2);
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  margin: -6px;
}

.paired-hero {
  position: relative;
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.paired-hero__badge {
  position: absolute;
  top: -14px;
  right: -14px;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: var(--sd-success);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  box-shadow: var(--sd-shadow-sm);
}

.paired-hero__eyebrow {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--sd-success);
  margin: 0;
}

.paired-hero__title {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 26px;
  letter-spacing: -0.015em;
  line-height: 1.15;
  color: var(--sd-fg1);
  margin: 6px 0 0;
}

.paired-hero__subtitle {
  font-family: var(--sd-font-body);
  font-size: 14px;
  line-height: 1.45;
  color: var(--sd-fg2);
  margin: 8px 0 0;
  max-width: 300px;
}

.paired-form {
  margin-top: 24px;
}

.paired-spacer {
  flex: 1;
}

.paired-actions {
  display: flex;
  gap: 12px;
  padding-bottom: 24px;
  flex: none;
}

.paired-actions__primary {
  flex: 1;
}
</style>
