<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Pencil, MoreHorizontal, List, BarChart3, Users, Star, Bluetooth, Camera, ImagePlus, Trash2 } from 'lucide-vue-next'
import AppLayout from '@/layouts/AppLayout.vue'
import SdAppBar from '@/components/ui/SdAppBar.vue'
import SdDiscImage from '@/components/discs/SdDiscImage.vue'
import { SdCard, SdIconBtn, SdBottomSheet, SdField, SdBtn } from '@/components/ui'
import { useDiscs } from '@/composables/useDiscs'
import { useFavorites } from '@/composables/useFavorites'
import { mapAuthError } from '@/stores/auth'
import { ApiError } from '@/services/api'
import { sanitizeText } from '@/utils/sanitize'
import { useI18n } from '@/i18n'

const route  = useRoute()
const router = useRouter()
const { getDisc, fetchDiscs, renameDisc, uploadDiscImage, deleteDiscImage } = useDiscs()
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

// ── Disc photo (owner only) ───────────────────────────────────────────────
// @capacitor/camera isn't a dependency, so this uses plain file inputs: one
// with `capture` (goes straight to the camera in the Capacitor WebView) and
// one without (the OS photo picker).
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024

const photoSheet = ref(false)
const photoError = ref('')
const photoBusy = ref(null) // 'uploading' | 'removing' | null
const cameraInput = ref(null)
const libraryInput = ref(null)

function openPhotoSheet() {
  if (photoBusy.value) return
  photoError.value = ''
  photoSheet.value = true
}

function pickPhotoAction(action) {
  // Still inside the click gesture, so the picker is allowed to open.
  const input = action === 'camera' ? cameraInput.value : libraryInput.value
  input?.click()
}

function photoErrorFor(err, fallbackKey) {
  if (err?.status === 413) return t('discs.photo.tooLarge')
  if (err?.status === 415) return t('discs.photo.unsupported')
  // Anything that never reached the API (canvas/decode failures) has no
  // ApiError shape for mapAuthError to read.
  if (!(err instanceof ApiError)) return t(fallbackKey)
  return mapAuthError(err, t)
}

async function handleFilePicked(event) {
  const input = event.target
  const file = input.files?.[0]
  // Reset immediately so re-picking the same file fires `change` again.
  input.value = ''
  if (!file || photoBusy.value) return

  photoError.value = ''
  // HEIC pickers sometimes report an empty type — only reject a type that is
  // present and clearly not an image; the server has the final say.
  if (file.type && !file.type.startsWith('image/')) {
    photoError.value = t('discs.photo.unsupported')
    return
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    photoError.value = t('discs.photo.tooLarge')
    return
  }

  photoBusy.value = 'uploading'
  try {
    await uploadDiscImage(route.params.id, file)
    photoSheet.value = false
  } catch (err) {
    photoError.value = photoErrorFor(err, 'discs.photo.uploadFailed')
  } finally {
    photoBusy.value = null
  }
}

async function handleRemovePhoto() {
  if (photoBusy.value) return
  photoError.value = ''
  photoBusy.value = 'removing'
  try {
    await deleteDiscImage(route.params.id)
    photoSheet.value = false
  } catch (err) {
    photoError.value = photoErrorFor(err, 'discs.photo.removeFailed')
  } finally {
    photoBusy.value = null
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
        <button
          type="button"
          class="hero-card__photo"
          :aria-label="disc.hasImage ? t('discs.photo.change') : t('discs.photo.add')"
          :disabled="!!photoBusy"
          @click="openPhotoSheet"
        >
          <SdDiscImage
            :image-url="disc.imageUrl"
            :size="46"
            :alt="t('discs.photo.alt', { name: disc.name })"
          />
          <span class="hero-card__photo-badge">
            <Camera :size="11" :stroke-width="2" />
          </span>
        </button>
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

    <!-- Photo sheet + the pickers it drives -->
    <SdBottomSheet v-model="photoSheet" :title="t('discs.photo.sheetTitle')">
      <p v-if="photoError" class="photo-error" role="alert">{{ photoError }}</p>
      <p v-else-if="photoBusy" class="photo-status" role="status">
        {{ photoBusy === 'removing' ? t('discs.photo.removing') : t('discs.photo.uploading') }}
      </p>
      <div class="photo-actions" :aria-busy="!!photoBusy">
        <SdBtn variant="primary" size="md" block :disabled="!!photoBusy" @click="pickPhotoAction('library')">
          <template #icon-left>
            <ImagePlus :size="16"/>
          </template>
          {{ t('discs.photo.chooseFromLibrary') }}
        </SdBtn>
        <SdBtn variant="ghost" size="md" block :disabled="!!photoBusy" @click="pickPhotoAction('camera')">
          <template #icon-left>
            <Camera :size="16"/>
          </template>
          {{ t('discs.photo.takePhoto') }}
        </SdBtn>
        <SdBtn
          v-if="disc?.hasImage"
          variant="ghost"
          size="md"
          block
          class="photo-remove-btn"
          :disabled="!!photoBusy"
          @click="handleRemovePhoto"
        >
          <template #icon-left>
            <Trash2 :size="16"/>
          </template>
          {{ t('discs.photo.remove') }}
        </SdBtn>
      </div>
    </SdBottomSheet>
    <input
      ref="cameraInput"
      class="visually-hidden"
      type="file"
      accept="image/*"
      capture="environment"
      tabindex="-1"
      aria-hidden="true"
      @change="handleFilePicked"
    />
    <input
      ref="libraryInput"
      class="visually-hidden"
      type="file"
      accept="image/*"
      tabindex="-1"
      aria-hidden="true"
      @change="handleFilePicked"
    />

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

/* The tile itself is SdDiscImage; this is just the tap target that carries
   the camera badge (same affordance as the edit/fav buttons beside it). */
.hero-card__photo {
  position: relative;
  flex: none;
  display: flex;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: var(--sd-r-md);
  outline: none;
  -webkit-tap-highlight-color: transparent;
}
.hero-card__photo:active { transform: scale(0.94); }
.hero-card__photo:disabled { cursor: default; opacity: 0.6; }
.hero-card__photo:disabled:active { transform: none; }
.hero-card__photo:focus:not(:focus-visible) {
  outline: none;
  box-shadow: none;
}

.hero-card__photo-badge {
  position: absolute;
  right: -3px;
  bottom: -3px;
  width: 19px;
  height: 19px;
  border-radius: 999px;
  background: var(--sd-gold-grad);
  color: #5a4416;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #fff;
  box-shadow: var(--sd-shadow-sm);
}

.photo-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.photo-remove-btn {
  color: var(--sd-danger) !important;
  border-color: rgba(192, 88, 78, .30) !important;
}

.photo-error,
.photo-status {
  font-family: var(--sd-font-body);
  font-size: 13px;
  margin: 0 0 12px;
}

.photo-error { color: var(--sd-danger); }
.photo-status { color: var(--sd-fg3); }

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

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
