<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Pencil, MoreHorizontal, List, BarChart3, Users, Star, Bluetooth } from 'lucide-vue-next'
import AppLayout from '@/layouts/AppLayout.vue'
import SdAppBar from '@/components/ui/SdAppBar.vue'
import { SdCard, SdIconBtn, SdBottomSheet, SdField, SdBtn } from '@/components/ui'
import { useDiscs } from '@/composables/useDiscs'
import { useFavorites } from '@/composables/useFavorites'
import { mapAuthError } from '@/stores/auth'
import { sanitizeText } from '@/utils/sanitize'
import { useI18n } from '@/i18n'

const route  = useRoute()
const router = useRouter()
const { getDisc, fetchDiscs, renameDisc } = useDiscs()
const { isFavorite, toggleFavorite } = useFavorites()
const { t } = useI18n()

const disc = computed(() => getDisc(route.params.id))

onMounted(() => {
  if (!disc.value) {
    fetchDiscs().catch(() => {
      // disc just stays null if this fails; template already handles that case
    })
  }
})

// ── Rename (persisted on the backend) ─────────────────────────────────────
const renameSheet = ref(false)
const renameValue = ref('')
const renameError = ref('')
const renameLoading = ref(false)

function openRenameSheet() {
  renameValue.value = disc.value?.name ?? ''
  renameError.value = ''
  renameSheet.value = true
}

async function handleRename() {
  const name = renameValue.value.trim()
  if (!name || renameLoading.value) return
  renameLoading.value = true
  renameError.value = ''
  try {
    await renameDisc(route.params.id, name)
    renameSheet.value = false
  } catch (err) {
    renameError.value = mapAuthError(err, t)
  } finally {
    renameLoading.value = false
  }
}

const tabs = computed(() => [
  { key: 'throws', label: t('discs.detail.throws'), icon: List,     count: () => disc.value?.throws, to: suffix => `/discs/${route.params.id}/throws` },
  { key: 'stats',  label: t('discs.detail.stats'),  icon: BarChart3, to: suffix => `/discs/${route.params.id}/stats` },
  { key: 'people', label: t('discs.detail.people'), icon: Users,     count: () => disc.value?.players, to: suffix => `/discs/${route.params.id}/people` },
])

const activeTab = computed(() => {
  if (route.path.endsWith('/stats'))  return 'stats'
  if (route.path.endsWith('/people')) return 'people'
  return 'throws'
})
</script>

<template>
  <AppLayout>
    <SdAppBar back :title="disc?.name ?? ''">
      <template #action>
      </template>
    </SdAppBar>

    <!-- Hero card -->
    <SdCard v-if="disc" class="hero-card" :padding="14">
      <div class="hero-card__top">
        <div class="hero-card__mark">
          <img src="/images/SmartDisc_Mark.png" alt="" />
        </div>
        <div class="hero-card__info">
          <div class="hero-card__name-row">
            <span class="hero-card__name">{{ disc.name }}</span>
            <button type="button" class="hero-card__edit" @click="openRenameSheet">
              <Pencil :size="14" :stroke-width="1.75" style="color: var(--sd-fg3);" />
            </button>
          </div>
          <div class="hero-card__uuid">{{ disc.uuid }}</div>
        </div>
        <button
          type="button"
          class="hero-card__fav"
          :aria-pressed="isFavorite(disc.id)"
          @click="toggleFavorite(disc.id)"
        >
          <Star
            :size="22"
            :stroke-width="2"
            :fill="isFavorite(disc.id) ? 'var(--sd-gold-500)' : 'none'"
            :style="{ color: isFavorite(disc.id) ? 'var(--sd-gold-500)' : 'var(--sd-mist)' }"
          />
        </button>
      </div>
    </SdCard>

    <!-- Rename sheet -->
    <SdBottomSheet v-model="renameSheet" :title="t('discs.detail.renameSheetTitle')">
      <div class="rename-stack">
        <SdField
          v-model="renameValue"
          :label="t('discs.detail.renameLabel')"
          :sanitize="sanitizeText"
          :maxlength="60"
          :error="renameError"
        />
        <div class="rename-actions">
          <SdBtn variant="ghost" size="md" style="flex:1;" @click="renameSheet = false">
            {{ t('common.cancel') }}
          </SdBtn>
          <SdBtn
            variant="primary"
            size="md"
            style="flex:1;"
            :disabled="!renameValue.trim() || renameLoading"
            @click="handleRename"
          >
            {{ renameLoading ? t('discs.detail.renaming') : t('common.save') }}
          </SdBtn>
        </div>
      </div>
    </SdBottomSheet>

    <!-- Top tabs -->
    <nav class="top-tabs">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.key"
        :to="tab.to()"
        :class="['top-tabs__item', { 'top-tabs__item--on': activeTab === tab.key }]"
        replace
      >
        <component :is="tab.icon" :size="14" :stroke-width="activeTab === tab.key ? 2 : 1.75" />
        <span>{{ tab.label }}</span>
        <small v-if="tab.count && tab.count()">{{ tab.count() }}</small>
      </RouterLink>
    </nav>

    <!-- Sub-route content -->
    <RouterView />

    <RouterLink :to="`/discs/${route.params.id}/live`" class="fab">
      <Bluetooth :size="26" :stroke-width="2" />
    </RouterLink>
  </AppLayout>
</template>

<style scoped>
.hero-card { margin-bottom: 12px; }

.hero-card__top {
  display: flex;
  align-items: center;
  gap: 14px;
}

.hero-card__mark {
  width: 46px;
  height: 46px;
  border-radius: var(--sd-r-md);
  background: linear-gradient(140deg, #1d3d72, #0a1c3d);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--sd-shadow-sm);
  flex: none;
}
.hero-card__mark img { width: 34px; height: 34px; object-fit: contain; }

.hero-card__info { flex: 1; min-width: 0; }

.hero-card__name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.hero-card__name {
  font-family: var(--sd-font-display);
  font-weight: 600;
  font-size: 19px;
  letter-spacing: -0.01em;
  color: var(--sd-fg1);
  line-height: 1;
}
.hero-card__uuid {
  font-family: var(--sd-font-display);
  font-size: 11px;
  color: var(--sd-fg3);
  letter-spacing: 0.02em;
  margin-top: 4px;
}

.hero-card__edit,
.hero-card__fav {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  margin: -6px;
  display: flex;
  flex: none;
  border-radius: 999px;
}
.hero-card__edit:active,
.hero-card__fav:active { transform: scale(0.9); }

.rename-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 4px;
}

.rename-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

/* Top segmented tabs */
.top-tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: rgba(16, 42, 87, .06);
  border-radius: var(--sd-r-pill);
  margin-bottom: 12px;
}

.top-tabs__item {
  flex: 1;
  padding: 9px 6px;
  border-radius: var(--sd-r-pill);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: var(--sd-font-display);
  font-weight: 500;
  font-size: 13px;
  color: var(--sd-fg2);
  text-decoration: none;
  transition: background var(--sd-dur-fast) var(--sd-ease-out),
              color var(--sd-dur-fast) var(--sd-ease-out);
}
.top-tabs__item--on {
  background: #fff;
  color: var(--sd-ink);
  box-shadow: var(--sd-shadow-sm);
}

.top-tabs__item small {
  display: inline-block;
  font-family: var(--sd-font-display);
  background: rgba(16, 42, 87, .10);
  color: var(--sd-ink);
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 999px;
  font-weight: 600;
}
.top-tabs__item--on small {
  background: var(--sd-ink);
  color: #fff;
}

.fab {
  position: sticky;
  bottom: 24px;
  margin-top: auto;
  margin-left: auto;
  flex: none;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: var(--sd-gold-grad);
  color: #5a4416;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 14px 32px rgba(184, 146, 79, .5), var(--sd-shadow-md);
  z-index: 10;
  border: 1px solid rgba(255, 255, 255, .4);
  text-decoration: none;
}
.fab:active { transform: scale(0.93); }
</style>
