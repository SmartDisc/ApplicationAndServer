<script setup>
// Initials on a hue-derived gradient, with an optional photo layered over them.
// `imageUrl` is the authenticated avatar endpoint, so the bytes are fetched
// through the api layer rather than handed to the browser as an <img src>.
// Anything that goes wrong — no photo, 404, unreachable, undecodable bytes —
// leaves the initials showing, and the box is a fixed size either way so a
// list never reflows while photos arrive.
import { computed, ref, watch } from 'vue'
import { useAuthedImage } from '@/composables/useAuthedImage'

const props = defineProps({
  name: { type: String, default: '?' },
  size: { type: Number, default: 38 },
  hue:  { type: Number, default: 200 },
  imageUrl: { type: String, default: null },
  hasImage: { type: Boolean, default: false },
})

const initials = computed(() =>
  props.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
)

const bg = computed(() =>
  `linear-gradient(140deg, hsl(${props.hue} 35% 45%), hsl(${props.hue + 30} 40% 30%))`
)

const { src, loading } = useAuthedImage(() => props.imageUrl || null)

const decodeFailed = ref(false)
watch(src, () => { decodeFailed.value = false })

const showPhoto = computed(() => !!src.value && !decodeFailed.value)
const pending = computed(() => props.hasImage && loading.value && !showPhoto.value)
</script>

<template>
  <span
    class="avatar"
    :class="{ 'avatar--pending': pending }"
    :style="{
      width: size + 'px',
      height: size + 'px',
      fontSize: Math.round(size * 0.36) + 'px',
      background: bg,
    }"
  >
    <span class="avatar__initials">{{ initials }}</span>
    <img
      v-if="showPhoto"
      class="avatar__photo"
      :src="src"
      alt=""
      @error="decodeFailed = true"
    />
  </span>
</template>

<style scoped>
.avatar {
  position: relative;
  border-radius: 999px;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-family: var(--sd-font-display);
  font-weight: 600;
  flex: none;
}

.avatar__initials {
  transition: opacity var(--sd-dur-base) var(--sd-ease-out);
}

.avatar--pending .avatar__initials {
  opacity: 0.5;
}

.avatar__photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

@media (prefers-reduced-motion: reduce) {
  .avatar__initials { transition: none; }
}
</style>
